import { APIGatewayEvent } from "aws-lambda";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { SignInDto } from "../../types/dtos/signin.dto";
import { compare } from "bcryptjs";
import { User } from "../../types/dtos/model/user.type";

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
    console.log(process.env.DYNAMODB_EMAIL_INDEX);
    const dynamodb = new DynamoDBClient({ endpoint: "http://localhost:8000" });
    const command = new QueryCommand({
        TableName: process.env.DYNAMODB_USER_TABLE,
        IndexName: process.env.DYNAMODB_EMAIL_INDEX,
        KeyConditionExpression: "email = :email",
        ExpressionAttributeValues: {
            ":email": { S: signInDto.email },
        },
    });
    const result = await dynamodb.send(command);
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
    return {
        statusCode: 200,
        body: JSON.stringify({ accessToken: "jwt_goes_here" }),
    };
}
