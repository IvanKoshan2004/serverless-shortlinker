export function extractBearerToken(authHeader: string | undefined): string {
    if (authHeader === undefined) {
        return "";
    }
    const authHeaderSplit = authHeader.split(" ");
    if (authHeaderSplit[0] === "Bearer") {
        return authHeaderSplit[1];
    }
    return "";
}
