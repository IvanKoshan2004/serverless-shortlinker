import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import {
    DynamoDBClient,
    GetItemCommand,
    GetItemCommandOutput,
    PutItemCommand,
    UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { View } from "../../types/model/view.type";
import { randomUUID } from "crypto";
import { ShortLink } from "../../types/model/short-link.type";
import { createJsonResponse } from "../lib/create-json-response";

export async function handler(
    event: APIGatewayEvent
): Promise<APIGatewayProxyResult> {
    const dynamodb = new DynamoDBClient({
        endpoint: process.env.IS_OFFLINE ? "http://localhost:8000" : undefined,
    });
    const linkId = event.pathParameters?.linkId;
    if (!linkId) {
        return createJsonResponse(404, {
            success: false,
            error: "Link with this id not found",
        });
    }
    let getLinkQuery: GetItemCommandOutput;
    try {
        getLinkQuery = await dynamodb.send(
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
    } catch (e) {
        console.log(e);
        return createJsonResponse(500, {
            success: false,
            error: "Error happened while the link from database",
        });
    }
    const shortLink = getLinkQuery.Item as ShortLink;
    if (!shortLink) {
        return createJsonResponse(404, {
            success: false,
            error: "Short link is not found",
        });
    }
    if (!shortLink.active.BOOL) {
        return createJsonResponse(400, {
            success: false,
            error: "Short link is not active",
        });
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
    try {
        await dynamodb.send(
            new PutItemCommand({
                TableName: process.env.DYNAMODB_VIEW_TABLE!,
                Item: viewItem,
            })
        );
    } catch (e) {
        console.log(e);
        return createJsonResponse(500, {
            success: false,
            error: "Error happened while saving view to database",
        });
    }
    if (shortLink.oneTime.BOOL == true) {
        try {
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
        } catch (e) {
            console.log(e);
            return createJsonResponse(500, {
                success: false,
                error: "Error happened while updating link",
            });
        }
    }
    return {
        statusCode: 301,
        headers: {
            Location: shortLink.link.S,
        },
        body: "",
    };
}
