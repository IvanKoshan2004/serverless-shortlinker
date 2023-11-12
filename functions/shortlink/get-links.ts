import { APIGatewayEvent } from "aws-lambda";
import { extractBearerToken } from "../lib/extract-bearer-token";
import { authorizeJwtToken } from "../lib/authorize-jwt-token";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { UserJwtPayload } from "../../types/model/user-jwt.type";
import { ShortLink } from "../../types/model/short-link.type";

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

    const dynamodb = new DynamoDBClient({
        endpoint: process.env.IS_OFFLINE ? "http://localhost:8000" : undefined,
    });

    const result = await dynamodb.send(
        new QueryCommand({
            TableName: process.env.DYNAMODB_SHORTLINK_TABLE,
            IndexName: process.env.DYNAMODB_SHORTLINK_TABLE_USER_INDEX,
            KeyConditionExpression: "userId = :userId",
            ExpressionAttributeValues: {
                ":userId": { S: verifyJwtRO.payload.userId },
            },
        })
    );
    if (!result.Items) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
            }),
        };
    }
    const shortLinks = result.Items as ShortLink[];
    const linkIds = shortLinks.map((el) => el.linkId.S);
    const viewCounts = await Promise.all(
        linkIds.map(async (linkId) => {
            const viewResult = await dynamodb.send(
                new QueryCommand({
                    TableName: process.env.DYNAMODB_VIEW_TABLE,
                    IndexName: process.env.DYNAMODB_VIEW_TABLE_LINK_INDEX,
                    KeyConditionExpression: "linkId = :linkId",
                    ExpressionAttributeValues: {
                        ":linkId": { S: linkId },
                    },
                })
            );
            return {
                linkId: linkId,
                viewCount: viewResult.Items ? viewResult.Items.length : 0,
            };
        })
    );
    const linkObjects = linkIds.map((linkId) => {
        const viewCount = viewCounts.find((el) => el.linkId == linkId);
        const shortLink = shortLinks.find((el) => el.linkId.S == linkId);
        return {
            linkId: linkId,
            link: shortLink?.link.S,
            viewCount: viewCount?.viewCount,
        };
    });
    return {
        statusCode: 201,
        body: JSON.stringify({
            success: true,
            links: linkObjects,
        }),
    };
}
