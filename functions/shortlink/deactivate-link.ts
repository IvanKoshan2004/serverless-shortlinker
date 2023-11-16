import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { extractBearerToken } from "../lib/extract-bearer-token";
import { authorizeJwtToken } from "../lib/authorize-jwt-token";
import {
    DynamoDBClient,
    GetItemCommand,
    GetItemCommandOutput,
    UpdateItemCommand,
    UpdateItemCommandOutput,
} from "@aws-sdk/client-dynamodb";
import { UserJwtPayload } from "../../types/model/user-jwt.type";
import { createJsonResponse } from "../lib/create-json-response";
import { DeactivateLinkRO } from "../../types/ros/deactivate-link.ro";
import { ShortLink } from "../../types/model/short-link.type";

export async function handler(
    event: APIGatewayEvent
): Promise<APIGatewayProxyResult> {
    const accessToken = extractBearerToken(
        event.headers["authorization"] || event.headers["Authorization"]
    );
    const verifyJwtRO = await authorizeJwtToken<UserJwtPayload>(accessToken);
    if (!verifyJwtRO.success) {
        return createJsonResponse(401, {
            success: false,
            error: verifyJwtRO.error,
        });
    }
    const linkId = event.pathParameters?.linkId;
    if (!linkId) {
        return createJsonResponse(400, {
            success: false,
            error: "Link id parameter should be specified in the path",
        });
    }
    const dynamodb = new DynamoDBClient({
        endpoint: process.env.IS_OFFLINE ? "http://localhost:8000" : undefined,
    });
    let linkGet: GetItemCommandOutput;
    try {
        linkGet = await dynamodb.send(
            new GetItemCommand({
                TableName: process.env.DYNAMODB_SHORTLINK_TABLE,
                Key: {
                    linkId: {
                        S: linkId,
                    },
                },
            })
        );
    } catch (e) {
        console.log(e);
        return createJsonResponse(500, {
            success: false,
            error: "Failed to deactivate a link",
        });
    }
    const link = linkGet.Item as ShortLink;
    if (!link) {
        return createJsonResponse(404, {
            success: false,
            error: "Short link not found",
        });
    }
    if (link.userId.S !== verifyJwtRO.data.payload.userId) {
        return createJsonResponse(401, {
            success: false,
            error: "User unauthorized",
        });
    }
    let linkDeactivateUpdate: UpdateItemCommandOutput;
    try {
        linkDeactivateUpdate = await dynamodb.send(
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
    } catch (e) {
        console.log(e);
        return createJsonResponse(500, {
            success: false,
            error: "Failed to deactivate a link",
        });
    }
    return createJsonResponse<DeactivateLinkRO>(200, {
        success: true,
        data: {},
    });
}
