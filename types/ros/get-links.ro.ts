import { CommonRO } from "./common.ro";
export type LinkObject = {};
export type GetLinksRO = CommonRO<{
    links: LinkObject[];
}>;
