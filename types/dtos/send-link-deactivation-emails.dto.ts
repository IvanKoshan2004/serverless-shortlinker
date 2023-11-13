type LinkDeactivationEmail = {
    toAddress: string;
    linkId: string;
};
export type SendLinkDeactivationEmailsDto = {
    emails: LinkDeactivationEmail[];
};
