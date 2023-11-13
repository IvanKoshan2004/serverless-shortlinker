import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { LinkDeactivationEmailMessageBody } from "../../types/dtos/link-deactivation-email-message.dto";

export async function handler(event) {
    const ses = new SESClient();
    if (event.Records) {
        for (const record of event.Records) {
            const linkDeactivationEmailMessage = JSON.parse(
                record.body
            ) as LinkDeactivationEmailMessageBody;
            ses.send(
                new SendEmailCommand({
                    Source: process.env.SENDER_EMAIL_ADDRESS,
                    Destination: {
                        ToAddresses: [linkDeactivationEmailMessage.toAddress],
                    },
                    Message: {
                        Subject: { Data: "Your short link has expired" },
                        Body: {
                            Html: {
                                Data: `Your short link has expired, and is deactivated. Link ID is ${linkDeactivationEmailMessage.linkId}`,
                            },
                        },
                    },
                })
            );
        }
    }
    return { status: true };
}
