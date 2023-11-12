import { APIGatewayEvent } from "aws-lambda";
import { Lambda } from "aws-sdk";
import { VerifyJwtDto } from "../../types/dtos/verify-jwt.dto";
import { verify } from "jsonwebtoken";

export async function handler(event: VerifyJwtDto) {
    if (!event.accessToken) {
        return { authorized: false, error: "event must have accessToken" };
    }
    const isAuthenticated = verify(event.accessToken, process.env.JWT_SECRET!);
    if (!isAuthenticated) {
        return { authorized: false, error: "jwt is unauthenticated" };
    }
    return { authorized: true };
}
