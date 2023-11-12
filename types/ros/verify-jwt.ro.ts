export type VerifyJwtRO<T = any> =
    | { authorized: true; payload: T }
    | { authorized: false; error: string };
