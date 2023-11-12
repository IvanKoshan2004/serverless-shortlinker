import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { VerifyJwtRO } from "../../types/ros/verify-jwt.ro";

export async function authorizeJwtToken<T>(
    accessToken: string
): Promise<VerifyJwtRO<T>> {
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
