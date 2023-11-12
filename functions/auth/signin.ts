import { APIGatewayEvent } from "aws-lambda";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { SignInDto } from "../../types/dtos/signin.dto";
import { compare } from "bcryptjs";
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
    let signInDto: SignInDto;
    try {
        signInDto = JSON.parse(event.body);
    } catch (e) {
        return {
            statusCode: 400,
            body: "Invalid body",
        };
    }
    if (!signInDto.email) {
        return {
            statusCode: 400,
            body: "Request body should have email",
        };
    } else if (!signInDto.password) {
        return {
            statusCode: 400,
            body: "Request body should have password",
        };
    }
    const dynamodb = new DynamoDBClient({
        endpoint: process.env.IS_OFFLINE ? "http://localhost:8000" : undefined,
    });
    const result = await dynamodb.send(
        new QueryCommand({
            TableName: process.env.DYNAMODB_USER_TABLE,
            IndexName: process.env.DYNAMODB_EMAIL_INDEX,
            KeyConditionExpression: "email = :email",
            ExpressionAttributeValues: {
                ":email": { S: signInDto.email },
            },
        })
    );
    if (!result.Items || result.Items.length == 0) {
        return {
            statusCode: 404,
            body: "User email or password is invalid",
        };
    }
    const user = result.Items[0] as User;
    const isAuthenticated = await compare(
        signInDto.password,
        user.passwordHash.S
    );
    if (!isAuthenticated) {
        return {
            statusCode: 404,
            body: "User email or password is invalid",
        };
    }
    const jwtPayload: UserJwtPayload = {
        email: user.email.S,
        userId: user.userId.S,
    };
    const accessToken = sign(jwtPayload, process.env.JWT_SECRET!, {
        expiresIn: process.env.JWT_EXPIRE_IN,
    });
    return {
        statusCode: 200,
        body: JSON.stringify({ accessToken: accessToken }),
    };
}
