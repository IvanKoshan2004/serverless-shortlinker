import { APIGatewayProxyResult } from "aws-lambda";
export function createJsonResponse(
    statusCode: number,
    json: Record<any, any>
): APIGatewayProxyResult {
    return {
        statusCode: statusCode,
        body: JSON.stringify(json),
        headers: {
            "Content-Type": "application/json",
        },
    };
}
