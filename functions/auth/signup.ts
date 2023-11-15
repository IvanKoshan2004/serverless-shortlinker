import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import {
    DynamoDBClient,
    PutItemCommand,
    QueryCommand,
    QueryCommandOutput,
} from "@aws-sdk/client-dynamodb";
import { SignUpDto } from "../../types/dtos/signup.dto";
import { genSalt, hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { User } from "../../types/model/user.type";
import { sign } from "jsonwebtoken";
import { UserJwtPayload } from "../../types/model/user-jwt.type";
import { createJsonResponse } from "../lib/create-json-response";
import { SignUpRO } from "../../types/ros/signup.ro";

export async function handler(
    event: APIGatewayEvent
): Promise<APIGatewayProxyResult> {
    if (event.body === null) {
        return createJsonResponse(400, {
            success: false,
            error: "Request should contain a body",
        });
    }
    let signUpDto: SignUpDto;
    try {
        signUpDto = JSON.parse(event.body);
    } catch (e) {
        return createJsonResponse<SignUpRO>(400, {
            success: false,
            error: "Invalid body",
        });
    }
    if (!signUpDto.email) {
        return createJsonResponse<SignUpRO>(400, {
            success: false,
            error: "Request body should have email attribute",
        });
    } else if (!signUpDto.password) {
        return createJsonResponse<SignUpRO>(400, {
            success: false,
            error: "Request body should have password attribute",
        });
    }
    const dynamodb = new DynamoDBClient({
        endpoint: process.env.IS_OFFLINE ? "http://localhost:8000" : undefined,
    });
    let emailExistsQuery: QueryCommandOutput;
    try {
        emailExistsQuery = await dynamodb.send(
            new QueryCommand({
                TableName: process.env.DYNAMODB_USER_TABLE,
                IndexName: process.env.DYNAMODB_USER_TABLE_EMAIL_INDEX,
                KeyConditionExpression: "email = :email",
                ExpressionAttributeValues: {
                    ":email": { S: signUpDto.email },
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
    if (emailExistsQuery.Items && emailExistsQuery.Items.length != 0) {
        return createJsonResponse(409, {
            success: false,
            error: "User with this email already exists",
        });
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
    try {
        await dynamodb.send(
            new PutItemCommand({
                TableName: process.env.DYNAMODB_USER_TABLE!,
                Item: userItem,
            })
        );
    } catch (e) {
        console.log(e);
        return createJsonResponse(500, {
            success: false,
            error: "Error happened while saving user to the database",
        });
    }
    let getUserByEmailQuery: QueryCommandOutput;
    try {
        getUserByEmailQuery = await dynamodb.send(
            new QueryCommand({
                TableName: process.env.DYNAMODB_USER_TABLE,
                IndexName: process.env.DYNAMODB_USER_TABLE_EMAIL_INDEX,
                KeyConditionExpression: "email = :email",
                ExpressionAttributeValues: {
                    ":email": { S: signUpDto.email },
                },
            })
        );
    } catch (e) {
        console.log(e);
        return createJsonResponse(500, {
            success: false,
            error: "Error happened while saving user to the database",
        });
    }
    if (!getUserByEmailQuery.Items || getUserByEmailQuery.Items.length == 0) {
        return createJsonResponse<SignUpRO>(404, {
            success: false,
            error: "Can't find created user",
        });
    }
    const user = getUserByEmailQuery.Items[0] as User;
    const jwtPayload: UserJwtPayload = {
        email: user.email.S,
        userId: user.userId.S,
    };
    const accessToken = sign(jwtPayload, process.env.JWT_SECRET!, {
        expiresIn: process.env.JWT_EXPIRE_IN,
    });
    return createJsonResponse<SignUpRO>(201, {
        success: true,
        data: { accessToken: accessToken },
    });
}
