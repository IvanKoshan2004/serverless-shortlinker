import { VerifyJwtDto } from "../../types/dtos/verify-jwt.dto";
import { decode, verify } from "jsonwebtoken";
import { VerifyJwtRO } from "../../types/ros/verify-jwt.ro";

export async function handler(event: VerifyJwtDto): Promise<VerifyJwtRO> {
    if (!event.accessToken) {
        return { success: false, error: "event must have accessToken" };
    }
    try {
        const payload = verify(event.accessToken, process.env.JWT_SECRET!);
        return { success: true, data: { payload: payload } };
    } catch (e) {
        return { success: false, error: "jwt is unauthenticated" };
    }
}
