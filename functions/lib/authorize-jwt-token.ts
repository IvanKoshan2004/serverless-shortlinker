import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

export async function authorizeJwtToken(accessToken: string): Promise<boolean> {
    const lambda = new LambdaClient({
        endpoint: process.env.IS_OFFLINE ? "http://localhost:3002" : undefined,
    });
    const result = await lambda.send(
        new InvokeCommand({
            FunctionName: "shortlinker-dev-verify-jwt",
            InvocationType: "RequestResponse",
            Payload: JSON.stringify({ accessToken: accessToken }),
        })
    );
    const responseBody = JSON.parse(Buffer.from(result.Payload!).toString());
    return responseBody;
}
