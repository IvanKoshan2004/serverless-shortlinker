import { APIGatewayEvent } from "aws-lambda";
import { extractBearerToken } from "../lib/extract-bearer-token";
import { authorizeJwtToken } from "../lib/authorize-jwt-token";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { UserJwtPayload } from "../../types/model/user-jwt.type";

export async function handler(event: APIGatewayEvent) {
    const accessToken = extractBearerToken(
        event.headers["authorization"] || event.headers["Authorization"]
    );
    const verifyJwtRO = await authorizeJwtToken<UserJwtPayload>(accessToken);
    if (!verifyJwtRO.authorized) {
        return {
            statusCode: 401,
            body: verifyJwtRO.error,
        };
    }
    const linkId = event.pathParameters?.linkId;
    if (!linkId) {
        return {
            statusCode: 404,
            body: "Not Found",
        };
    }
    const dynamodb = new DynamoDBClient({
        endpoint: process.env.IS_OFFLINE ? "http://localhost:8000" : undefined,
    });

    const result = await dynamodb.send(
        new UpdateItemCommand({
            TableName: process.env.DYNAMODB_SHORTLINK_TABLE,
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
    if (result.$metadata.httpStatusCode !== 200) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
            }),
        };
    }
    return {
        statusCode: 200,
        body: JSON.stringify({
            success: true,
        }),
    };
}
