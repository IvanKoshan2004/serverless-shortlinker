import { APIGatewayEvent } from "aws-lambda";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";

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
            AttributesToGet: ["link", "linkId"],
        })
    );
    const shortLink = result.Item;
    if (!shortLink) {
        return {
            statusCode: 404,
            body: "Short link is not found",
        };
    }
    const response = {
        statusCode: 301,
        headers: {
            Location: shortLink.link.S,
        },
    };
    return response;
}
