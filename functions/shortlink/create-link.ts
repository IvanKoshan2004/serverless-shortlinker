import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { extractBearerToken } from "../lib/extract-bearer-token";
import { authorizeJwtToken } from "../lib/authorize-jwt-token";
import { CreateLinkDto } from "../../types/dtos/create-link.dto";
import {
    DynamoDBClient,
    PutItemCommand,
    QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { UserJwtPayload } from "../../types/model/user-jwt.type";
import { ShortLink } from "../../types/model/short-link.type";
import { getLinkExpirationTime } from "../lib/get-link-expiration-time";
import { createJsonResponse } from "../lib/create-json-response";

export async function handler(
    event: APIGatewayEvent
): Promise<APIGatewayProxyResult> {
    const accessToken = extractBearerToken(
        event.headers["authorization"] || event.headers["Authorization"]
    );
    const verifyJwtRO = await authorizeJwtToken<UserJwtPayload>(accessToken);
    if (!verifyJwtRO.authorized) {
        return createJsonResponse(401, {
            success: false,
            error: verifyJwtRO.error,
        });
    }
    if (event.body === null) {
        return createJsonResponse(400, {
            success: false,
            error: "Request should contain a body",
        });
    }
    let createLinkDto: CreateLinkDto;
    try {
        createLinkDto = JSON.parse(event.body);
    } catch (e) {
        return createJsonResponse(400, {
            success: false,
            error: "Invalid body",
        });
    }
    if (!createLinkDto.expiration) {
        return createJsonResponse(400, {
            success: false,
            error: "Request body should have expiration attribute",
        });
    } else if (!createLinkDto.link) {
        return createJsonResponse(400, {
            success: false,
            error: "Request body should have link attribute",
        });
    }
    try {
        const fixedLink = new URL(createLinkDto.link).href;
        createLinkDto.link = fixedLink;
    } catch (e) {
        return createJsonResponse(400, {
            success: false,
            error: "The link should have a valid format",
        });
    }

    const dynamodb = new DynamoDBClient({
        endpoint: process.env.IS_OFFLINE ? "http://localhost:8000" : undefined,
    });

    function createLinkId() {
        const MAX_BYTES_PER_LINK_ID = 4;
        const bytes: number[] = [];
        let number = Math.ceil(
            Math.random() * (2 ** 8) ** MAX_BYTES_PER_LINK_ID
        );
        for (let i = 0; i < MAX_BYTES_PER_LINK_ID; i++) {
            bytes.push(number & 0xff);
            number = Math.floor(number / 256);
        }
        const buffer = Buffer.from(bytes);
        return buffer.toString("base64url");
    }

    let linkId;
    while (true) {
        linkId = createLinkId();
        const result = await dynamodb.send(
            new QueryCommand({
                TableName: process.env.DYNAMODB_SHORTLINK_TABLE,
                KeyConditionExpression: "linkId = :linkId",
                ExpressionAttributeValues: {
                    ":linkId": { S: linkId },
                },
            })
        );
        if (result.Items?.length == 0) {
            break;
        }
    }
    const shortLinkItem: ShortLink = {
        linkId: {
            S: linkId,
        },
        link: {
            S: createLinkDto.link,
        },
        userId: {
            S: verifyJwtRO.payload.userId,
        },
        oneTime: {
            BOOL: createLinkDto.expiration == "one-time",
        },
        expireAt: {
            N: getLinkExpirationTime(createLinkDto.expiration).toString(),
        },
        active: {
            BOOL: true,
        },
    };
    await dynamodb.send(
        new PutItemCommand({
            TableName: process.env.DYNAMODB_SHORTLINK_TABLE!,
            Item: shortLinkItem,
        })
    );
    const host = event.headers["Host"] || event.headers["host"];
    const proto =
        event.headers["X-Forwarded-Proto"] ||
        event.headers["x-forwarded-proto"] ||
        "http";
    const link = `${proto}://${host}/${linkId}`;
    return createJsonResponse(201, {
        success: true,
        data: {
            linkId: linkId,
            link: link,
        },
    });
}
