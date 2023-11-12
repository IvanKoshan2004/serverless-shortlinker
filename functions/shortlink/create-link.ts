import { APIGatewayEvent } from "aws-lambda";
import { extractBearerToken } from "../lib/extract-bearer-token";
import { authorizeJwtToken } from "../lib/authorize-jwt-token";

export async function handler(event: APIGatewayEvent) {
    const accessToken = extractBearerToken(event.headers.authorization);
    const isAuthorized = await authorizeJwtToken(accessToken);
    if (!isAuthorized) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: "Unauthorized" }),
        };
    }
    return {
        statusCode: 200,
        body: JSON.stringify({}),
    };
}
