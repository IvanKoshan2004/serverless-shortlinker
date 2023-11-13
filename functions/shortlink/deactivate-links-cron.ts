import {
    BatchGetItemCommand,
    DynamoDBClient,
    ScanCommand,
    UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { SQSClient, SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { User } from "../../types/model/user.type";
import { randomUUID } from "crypto";
import { LinkDeactivationEmailMessageBody } from "../../types/dtos/link-deactivation-email-message.dto";

export async function handler() {
    const dynamodb = new DynamoDBClient({
        endpoint: process.env.IS_OFFLINE ? "http://localhost:8000" : undefined,
    });

    const expiredLinks = await dynamodb.send(
        new ScanCommand({
            TableName: process.env.DYNAMODB_SHORTLINK_TABLE,
            FilterExpression: "expireAt < :currentTime",
            ExpressionAttributeValues: {
                ":currentTime": { N: Date.now().toString() },
            },
        })
    );
    if (!expiredLinks.Items || expiredLinks.Items.length == 0) {
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
            }),
        };
    }
    const shortLinksForDeactivation = expiredLinks.Items;
    // .filter(
    // (item) => item.oneTime.BOOL == false
    // );
    const userIds = [
        ...new Set(shortLinksForDeactivation.map((el) => el.userId.S)),
    ];
    const getUserEmailRequests = userIds.map((userId) => ({
        userId: {
            S: userId!,
        },
    }));
    const deactivationPromises = shortLinksForDeactivation.map((item) => {
        dynamodb.send(
            new UpdateItemCommand({
                TableName: process.env.DYNAMODB_SHORTLINK_TABLE,
                Key: {
                    linkId: { S: item.linkId.S! },
                },
                UpdateExpression: "SET active = :active",
                ExpressionAttributeValues: {
                    ":active": { BOOL: false },
                },
            })
        );
    });
    await Promise.all(deactivationPromises);
    const userEmails = await dynamodb.send(
        new BatchGetItemCommand({
            RequestItems: {
                [process.env.DYNAMODB_USER_TABLE!]: {
                    Keys: getUserEmailRequests,
                },
            },
        })
    );
    const users =
        userEmails.Responses &&
        (userEmails.Responses[process.env.DYNAMODB_USER_TABLE!] as User[]);
    const deactivateLinkEmails: LinkDeactivationEmailMessageBody[] =
        shortLinksForDeactivation.map((shortLink) => {
            const userEmail = users?.find(
                (el) => el.userId.S == shortLink.userId.S
            )?.email.S;
            return {
                toAddress: userEmail!,
                linkId: shortLink.linkId.S!,
            };
        });
    const sqs = new SQSClient();
    const messages = deactivateLinkEmails.map((messageBody) => ({
        Id: randomUUID(),
        MessageBody: JSON.stringify(messageBody),
    }));
    await sqs.send(
        new SendMessageBatchCommand({
            QueueUrl: process.env.SQS_DEACTIVATION_QUEUE,
            Entries: messages,
        })
    );
    return {
        statusCode: 200,
        body: JSON.stringify({
            success: true,
        }),
    };
}
