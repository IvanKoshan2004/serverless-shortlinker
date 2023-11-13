import { APIGatewayEvent } from "aws-lambda";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { SignInDto } from "../../types/dtos/signin.dto";
import { compare } from "bcryptjs";
import { User } from "../../types/model/user.type";
import { sign } from "jsonwebtoken";
import { UserJwtPayload } from "../../types/model/user-jwt.type";
import { createJsonResponse } from "../lib/create-json-response";

export async function handler(event: APIGatewayEvent) {
    if (event.body === null) {
        return createJsonResponse(400, {
            error: "Request should contain a body",
        });
    }
    let signInDto: SignInDto;
    try {
        signInDto = JSON.parse(event.body);
    } catch (e) {
        return createJsonResponse(400, {
            error: "Invalid body",
        });
    }
    if (!signInDto.email) {
        return createJsonResponse(400, {
            error: "Request body should have email attribute",
        });
    } else if (!signInDto.password) {
        return createJsonResponse(400, {
            error: "Request body should have password attribute",
        });
    }
    const dynamodb = new DynamoDBClient({
        endpoint: process.env.IS_OFFLINE ? "http://localhost:8000" : undefined,
    });
    const result = await dynamodb.send(
        new QueryCommand({
            TableName: process.env.DYNAMODB_USER_TABLE,
            IndexName: process.env.DYNAMODB_USER_TABLE_EMAIL_INDEX,
            KeyConditionExpression: "email = :email",
            ExpressionAttributeValues: {
                ":email": { S: signInDto.email },
            },
        })
    );
    if (!result.Items || result.Items.length == 0) {
        return createJsonResponse(401, {
            error: "User email or password is invalid",
        });
    }
    const user = result.Items[0] as User;
    const isAuthenticated = await compare(
        signInDto.password,
        user.passwordHash.S
    );
    if (!isAuthenticated) {
        return createJsonResponse(401, {
            error: "User email or password is invalid",
        });
    }
    const jwtPayload: UserJwtPayload = {
        email: user.email.S,
        userId: user.userId.S,
    };
    const accessToken = sign(jwtPayload, process.env.JWT_SECRET!, {
        expiresIn: process.env.JWT_EXPIRE_IN,
    });
    return createJsonResponse(200, { accessToken: accessToken });
}
