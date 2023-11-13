export type CommonRO<TData = any> =
    | { success: true; data: TData }
    | { success: false; error: string };
