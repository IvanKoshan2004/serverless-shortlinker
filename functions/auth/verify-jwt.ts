import { VerifyJwtDto } from "../../types/dtos/verify-jwt.dto";
import { decode, verify } from "jsonwebtoken";

export async function handler(event: VerifyJwtDto) {
    if (!event.accessToken) {
        return { authorized: false, error: "event must have accessToken" };
    }
    const isAuthenticated = verify(event.accessToken, process.env.JWT_SECRET!);
    if (!isAuthenticated) {
        return { authorized: false, error: "jwt is unauthenticated" };
    }
    const payload = decode(event.accessToken, { json: true });
    return { authorized: true, payload: payload };
}
