export type CommonRO<TData = {}> =
    | { success: true; data: TData }
    | { success: false; error: string };
