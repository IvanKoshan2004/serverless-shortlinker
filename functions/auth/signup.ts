import { APIGatewayEvent } from "aws-lambda";
import {
    DynamoDBClient,
    PutItemCommand,
    QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { SignUpDto } from "../../types/dtos/signup.dto";
import { genSalt, hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { User } from "../../types/model/user.type";
import { sign } from "jsonwebtoken";
import { UserJwtPayload } from "../../types/model/user-jwt.type";

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
    const dynamodb = new DynamoDBClient({
        endpoint: process.env.IS_OFFLINE ? "http://localhost:8000" : undefined,
    });
    const emailExistsCheck = await dynamodb.send(
        new QueryCommand({
            TableName: process.env.DYNAMODB_USER_TABLE,
            IndexName: process.env.DYNAMODB_USER_EMAIL_INDEX,
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
    const userItem: User = {
        userId: {
            S: userId,
        },
        email: {
            S: signUpDto.email,
        },
        passwordHash: {
            S: generatedHash,
        },
    };
    await dynamodb.send(
        new PutItemCommand({
            TableName: process.env.DYNAMODB_USER_TABLE!,
            Item: userItem,
        })
    );
    const retrieveUserRequest = await dynamodb.send(
        new QueryCommand({
            TableName: process.env.DYNAMODB_USER_TABLE,
            IndexName: process.env.DYNAMODB_USER_EMAIL_INDEX,
            KeyConditionExpression: "email = :email",
            ExpressionAttributeValues: {
                ":email": { S: signUpDto.email },
            },
        })
    );
    if (!retrieveUserRequest.Items || retrieveUserRequest.Items.length == 0) {
        return {
            statusCode: 404,
            body: "User email or password is invalid",
        };
    }
    const user = retrieveUserRequest.Items[0] as User;
    const jwtPayload: UserJwtPayload = {
        email: user.email.S,
        userId: user.userId.S,
    };
    const accessToken = sign(jwtPayload, process.env.JWT_SECRET!, {
        expiresIn: process.env.JWT_EXPIRE_IN,
    });
    return {
        statusCode: 201,
        body: JSON.stringify({ accessToken: accessToken }),
    };
}
