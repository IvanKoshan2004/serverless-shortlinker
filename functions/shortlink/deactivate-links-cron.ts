import {
    DynamoDBClient,
    BatchWriteItemCommand,
    ScanCommand,
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
    const deleteRequests = expiredLinks.Items.map((item) => ({
        DeleteRequest: {
            Key: {
                linkId: { S: item.linkId.S! },
            },
        },
    }));
    const result = await dynamodb.send(
        new BatchWriteItemCommand({
            RequestItems: {
                [process.env.DYNAMODB_SHORTLINK_TABLE!]: deleteRequests,
            },
        })
    );

    if (result.$metadata.httpStatusCode !== 200) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
            }),
        };
    }
    return {
        statusCode: 200,
        body: JSON.stringify({
            success: true,
        }),
    };
}
