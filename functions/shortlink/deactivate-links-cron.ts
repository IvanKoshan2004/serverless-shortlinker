import {
    BatchGetItemCommand,
    BatchGetItemCommandOutput,
    DynamoDBClient,
    ScanCommand,
    ScanCommandOutput,
    UpdateItemCommand,
    UpdateItemCommandOutput,
} from "@aws-sdk/client-dynamodb";
import { SQSClient, SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { User } from "../../types/model/user.type";
import { randomUUID } from "crypto";
import { LinkDeactivationEmailMessageBody } from "../../types/dtos/link-deactivation-email-message.dto";
import { createJsonResponse } from "../lib/create-json-response";
import { DeactivateLinksCronRO } from "../../types/ros/deactivate-links-cron-ro";

export async function handler() {
    const dynamodb = new DynamoDBClient({
        endpoint: process.env.IS_OFFLINE ? "http://localhost:8000" : undefined,
    });
    let expiredLinksScan: ScanCommandOutput;
    try {
        expiredLinksScan = await dynamodb.send(
            new ScanCommand({
                TableName: process.env.DYNAMODB_SHORTLINK_TABLE,
                FilterExpression: "expireAt < :currentTime",
                ExpressionAttributeValues: {
                    ":currentTime": { N: Date.now().toString() },
                },
            })
        );
    } catch (e) {
        console.log(e);
        return createJsonResponse(500, {
            success: false,
            error: "Error happened while querying the database",
        });
    }
    if (!expiredLinksScan.Items || expiredLinksScan.Items.length == 0) {
        return createJsonResponse<DeactivateLinksCronRO>(200, {
            success: true,
            data: {},
        });
    }
    const shortLinksForDeactivation = expiredLinksScan.Items.filter(
        (item) => item.oneTime.BOOL == false
    );
    const userIds = [
        ...new Set(shortLinksForDeactivation.map((el) => el.userId.S)),
    ];
    const getUserEmailRequests = userIds.map((userId) => ({
        userId: {
            S: userId!,
        },
    }));
    let linkDeactivationUpdatePromises: Promise<UpdateItemCommandOutput>[];
    try {
        linkDeactivationUpdatePromises = shortLinksForDeactivation.map((item) =>
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
            )
        );
    } catch (e) {
        console.log(e);
        return createJsonResponse(500, {
            success: false,
            error: "Failed to deactivate links",
        });
    }
    await Promise.all(linkDeactivationUpdatePromises);
    let userEmailsBatchGet: BatchGetItemCommandOutput;
    try {
        userEmailsBatchGet = await dynamodb.send(
            new BatchGetItemCommand({
                RequestItems: {
                    [process.env.DYNAMODB_USER_TABLE!]: {
                        Keys: getUserEmailRequests,
                    },
                },
            })
        );
    } catch (e) {
        console.log(e);
        return createJsonResponse(500, {
            success: false,
            error: "Failed to get user emails",
        });
    }
    const users =
        userEmailsBatchGet.Responses &&
        (userEmailsBatchGet.Responses[
            process.env.DYNAMODB_USER_TABLE!
        ] as User[]);
    const deactivateLinkEmailMessages: LinkDeactivationEmailMessageBody[] =
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
    const messages = deactivateLinkEmailMessages.map((messageBody) => ({
        Id: randomUUID(),
        MessageBody: JSON.stringify(messageBody),
    }));
    try {
        await sqs.send(
            new SendMessageBatchCommand({
                QueueUrl: process.env.SQS_DEACTIVATION_QUEUE,
                Entries: messages,
            })
        );
    } catch (e) {
        console.log(e);
        return createJsonResponse(500, {
            success: false,
            error: "Failed to send messages to SQS",
        });
    }
    return createJsonResponse<DeactivateLinksCronRO>(200, {
        success: true,
        data: {},
    });
}
