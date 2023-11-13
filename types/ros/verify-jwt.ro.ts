export type VerifyJwtRO<T = any> =
    | { success: true; data: { payload: T } }
    | { success: false; error: string };
