import { ExpirationValue } from "../../types/dtos/create-link.dto";

export function getLinkExpirationTime(expiration: ExpirationValue) {
    const DAY_IN_SECONDS = 86400;
    const timestamp = Date.now();
    switch (expiration) {
        case "1d":
            return timestamp + DAY_IN_SECONDS * 1000 * 1;
        case "3d":
            return timestamp + DAY_IN_SECONDS * 1000 * 3;
        case "7d":
            return timestamp + DAY_IN_SECONDS * 1000 * 7;
        default:
            return timestamp;
    }
}
