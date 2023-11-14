import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { extractBearerToken } from "../lib/extract-bearer-token";
import { authorizeJwtToken } from "../lib/authorize-jwt-token";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { UserJwtPayload } from "../../types/model/user-jwt.type";
import { createJsonResponse } from "../lib/create-json-response";
import { DeactivateLinkRO } from "../../types/ros/deactivate-link.ro";

export async function handler(
    event: APIGatewayEvent
): Promise<APIGatewayProxyResult> {
    const accessToken = extractBearerToken(
        event.headers["authorization"] || event.headers["Authorization"]
    );
    const verifyJwtRO = await authorizeJwtToken<UserJwtPayload>(accessToken);
    if (!verifyJwtRO.success) {
        return createJsonResponse(400, {
            success: false,
            error: verifyJwtRO.error,
        });
    }
    const linkId = event.pathParameters?.linkId;
    if (!linkId) {
        return createJsonResponse(404, {
            success: false,
            error: "Link with this id not found",
        });
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
        return createJsonResponse(500, {
            success: false,
            error: "Link can't be deactivated",
        });
    }
    return createJsonResponse<DeactivateLinkRO>(200, {
        success: true,
        data: {},
    });
}
