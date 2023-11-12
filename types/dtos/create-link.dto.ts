export type CreateLinkDto = {
    link: string;
    expiration: "1d" | "3d" | "7d" | "one-time";
};
