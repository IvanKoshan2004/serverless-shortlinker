import { APIGatewayEvent } from "aws-lambda";
import {
    DynamoDBClient,
    GetItemCommand,
    PutItemCommand,
    UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { View } from "../../types/model/view.type";
import { randomUUID } from "crypto";
import { ShortLink } from "../../types/model/short-link.type";

export async function handler(event: APIGatewayEvent) {
    const dynamodb = new DynamoDBClient({
        endpoint: process.env.IS_OFFLINE ? "http://localhost:8000" : undefined,
    });
    const linkId = event.pathParameters?.linkId;
    if (!linkId) {
        return {
            statusCode: 404,
            body: "Not Found",
        };
    }
    const result = await dynamodb.send(
        new GetItemCommand({
            TableName: process.env.DYNAMODB_SHORTLINK_TABLE!,
            Key: {
                linkId: {
                    S: linkId,
                },
            },
            AttributesToGet: ["link", "linkId", "active", "oneTime"],
        })
    );
    const shortLink = result.Item as ShortLink;
    if (!shortLink) {
        return {
            statusCode: 404,
            body: "Short link is not found",
        };
    }
    if (!shortLink.active.BOOL) {
        return {
            statusCode: 400,
            body: "Short link is not active",
        };
    }

    const viewItem: View = {
        linkId: {
            S: linkId,
        },
        viewId: {
            S: randomUUID(),
        },
        timestamp: {
            N: Date.now().toString(),
        },
    };
    await dynamodb.send(
        new PutItemCommand({
            TableName: process.env.DYNAMODB_VIEW_TABLE!,
            Item: viewItem,
        })
    );
    if (shortLink.oneTime.BOOL == true) {
        await dynamodb.send(
            new UpdateItemCommand({
                TableName: process.env.DYNAMODB_SHORTLINK_TABLE!,
                Key: {
                    linkId: {
                        S: linkId,
                    },
                },
                UpdateExpression: "SET active = :active",
                ExpressionAttributeValues: {
                    ":active": { BOOL: false },
                },
            })
        );
    }
    const response = {
        statusCode: 301,
        headers: {
            Location: shortLink.link.S,
        },
    };
    return response;
}
