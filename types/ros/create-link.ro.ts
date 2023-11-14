import { CommonRO } from "./common.ro";

export type CreateLinkRO = CommonRO<{
    linkId: string;
    link: string;
}>;
