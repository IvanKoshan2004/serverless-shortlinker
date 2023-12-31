import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { VerifyJwtRO } from "../../types/ros/verify-jwt.ro";

export async function authorizeJwtToken<T>(
    accessToken: string
): Promise<VerifyJwtRO<T>> {
    const lambda = new LambdaClient({
        endpoint: process.env.IS_OFFLINE
            ? process.env.OFFLINE_LAMBDA_ENDPOINT
            : undefined,
    });
    try {
        const verifyJwtInvoke = await lambda.send(
            new InvokeCommand({
                FunctionName: process.env.VERIFY_JWT_FUNCTION,
                InvocationType: "RequestResponse",
                Payload: JSON.stringify({ accessToken: accessToken }),
            })
        );
        const responseBody = JSON.parse(
            Buffer.from(verifyJwtInvoke.Payload!).toString()
        );
        return responseBody;
    } catch (e) {
        console.log(e);
        return { success: false, error: "Failed to authorize jwt token" };
    }
}
