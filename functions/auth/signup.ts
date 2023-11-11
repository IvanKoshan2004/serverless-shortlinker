import { APIGatewayEvent } from "aws-lambda";
import {
    DynamoDBClient,
    PutItemCommand,
    QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { SignUpDto } from "../../types/dtos/signup.dto";
import { genSalt, hash } from "bcryptjs";
import { randomUUID } from "crypto";

export async function handler(event: APIGatewayEvent) {
    if (event.body === null) {
        return {
            statusCode: 400,
            body: "Request should contain a body",
        };
    }
    let signUpDto: SignUpDto;
    try {
        signUpDto = JSON.parse(event.body);
    } catch (e) {
        return {
            statusCode: 400,
            body: "Invalid body",
        };
    }
    if (!signUpDto.email) {
        return {
            statusCode: 400,
            body: "Request body should have email",
        };
    } else if (!signUpDto.password) {
        return {
            statusCode: 400,
            body: "Request body should have password",
        };
    }
    const dynamodb = new DynamoDBClient({ endpoint: "http://localhost:8000" });
    const emailExistsCheck = await dynamodb.send(
        new QueryCommand({
            TableName: process.env.DYNAMODB_USER_TABLE,
            IndexName: process.env.DYNAMODB_EMAIL_INDEX,
            KeyConditionExpression: "email = :email",
            ExpressionAttributeValues: {
                ":email": { S: signUpDto.email },
            },
        })
    );
    if (emailExistsCheck.Items && emailExistsCheck.Items.length != 0) {
        return {
            statusCode: 409,
            body: JSON.stringify("User with this email already exists"),
        };
    }
    const userId = randomUUID();
    const salt = await genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS!));
    const generatedHash = await hash(signUpDto.password, salt);
    await dynamodb.send(
        new PutItemCommand({
            TableName: process.env.DYNAMODB_USER_TABLE!,
            Item: {
                userId: {
                    S: userId,
                },
                email: {
                    S: signUpDto.email,
                },
                passwordHash: {
                    S: generatedHash,
                },
            },
        })
    );
    return {
        statusCode: 201,
        body: JSON.stringify({ accessToken: "jwt_goes_here" }),
    };
}
