import {
    DynamoDBClient,
    ScanCommand,
    UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";

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
    const shortLinksForUpdate = expiredLinks.Items.filter(
        (item) => item.oneTime.BOOL == false
    );
    const updatePromises = shortLinksForUpdate.map((item) => {
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
    await Promise.all(updatePromises);
    return {
        statusCode: 200,
        body: JSON.stringify({
            success: true,
        }),
    };
}
