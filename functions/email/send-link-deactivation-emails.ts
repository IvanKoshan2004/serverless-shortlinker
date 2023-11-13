import { SendLinkDeactivationEmailsDto } from "../../types/dtos/send-link-deactivation-emails.dto";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

export async function handler(event: SendLinkDeactivationEmailsDto) {
    const ses = new SESClient();

    const promises = event.emails.map((email) =>
        ses.send(
            new SendEmailCommand({
                Source: process.env.SENDER_EMAIL_ADDRESS,
                Destination: {
                    ToAddresses: [email.toAddress],
                },
                Message: {
                    Subject: { Data: "Your short link has expired" },
                    Body: {
                        Html: {
                            Data: `Your short link has expired, and is deactivated. Link ID is ${email.linkId}`,
                        },
                    },
                },
            })
        )
    );
    await Promise.all(promises);
    return { status: true };
}
