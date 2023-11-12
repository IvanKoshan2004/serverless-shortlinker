export type ExpirationValue = "1d" | "3d" | "7d" | "one-time";
export type CreateLinkDto = {
    link: string;
    expiration: ExpirationValue;
};
