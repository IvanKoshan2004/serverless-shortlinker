import { APIGatewayProxyResult } from "aws-lambda";
export function createJsonResponse<T = any>(
    statusCode: number,
    json: T
): APIGatewayProxyResult {
    return {
        statusCode: statusCode,
        body: JSON.stringify(json),
        headers: {
            "Content-Type": "application/json",
        },
    };
}
