export type ShortLink = {
    linkId: {
        S: string;
    };
    userId: {
        S: string;
    };
    link: {
        S: string;
    };
    oneTime: {
        BOOL: boolean;
    };
    expireAt: {
        N: string;
    };
};
