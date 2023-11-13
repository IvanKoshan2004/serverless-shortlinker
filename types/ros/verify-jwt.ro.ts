import { CommonRO } from "./common.ro";

export type VerifyJwtRO<T = any> = CommonRO<{ payload: T }>;
