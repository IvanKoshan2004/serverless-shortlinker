# Shortlinker app

## Overview

Shortlink application that provides an api for generating short links that redirect to another link specified by user.
The application provides ability to create and login into users, with further authentication done using JWT tokens.
Short links have multiple expiration options, and a one-time use expiration option as well. Once link gets expired, user gets a notification email about the event.
The application is based on serverless technologies provided by AWS.

## Project structure

`functions` folder contains folders `auth`, `email` and `shortlink` that contain lambda functions with corresponding use cases, and `lib` folder containing helper functions.

`types` folder contains typescript types for API responses, DynamoDB table items and request bodies.

## Running and Deploying

To run the application offline:

1. <b>Setup Serverless Framework on the machine</b> </br>
   To install the Serverless Framework follow the installation steps in the [documentation](https://www.serverless.com/framework/docs/getting-started).
2. <b>Install dependencies</b></br>
   Run `npm install` to install the dependencies.
3. <b>Run Local DynamoDB instance</b></br>
   An instance of DynamoDB should be run on the localhost at port 8000. You can use Docker to run an instance locally.
4. <b>Create Tables in Local Instance</b></br>
   Once the local DynamoDB instance is running, run the init-db.sh script to create tables.
5. <b>Run the application</b></br>
   Run `npm run offline` to run the application. Run `npm run offline:watch` to run the application in watch mode for development.

To deploy an application follow the next steps.

1. <b>Setup Serverless Framework on the machine</b> </br>
   To install the Serverless Framework follow the installation steps in the [documentation](https://www.serverless.com/framework/docs/getting-started). Make sure to configure your AWS credentials.
2. <b>Install dependencies</b></br>
   Run `npm install` to install the dependencies
3. <b>Deploy the application</b></br>
   Run `serverless deploy` to deploy the application to AWS.
4. <b>Configure SES</b></br>
   To allow the app to send emails to non-verified email address, you need to exit sandbox mode. This can be done through AWS management console. Alternatively, for testing purposes, verify your email addresses through the AWS management console.
