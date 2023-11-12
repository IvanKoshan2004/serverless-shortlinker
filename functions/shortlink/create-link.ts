import { APIGatewayEvent } from "aws-lambda";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { extractBearerToken } from "../lib/extract-bearer-token";

export async function handler(event: APIGatewayEvent) {
    const lambda = new LambdaClient({
        endpoint: "http://localhost:3002",
    });

    const accessToken = extractBearerToken(event.headers.authorization);
    const result = await lambda.send(
        new InvokeCommand({
            FunctionName: "shortlinker-dev-verify-jwt",
            InvocationType: "RequestResponse",
            Payload: JSON.stringify({ accessToken: accessToken }),
        })
    );
    const responseBody = JSON.parse(Buffer.from(result.Payload!).toString());
    if (!responseBody.authorized) {
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
