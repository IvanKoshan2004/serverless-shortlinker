#!/bin/bash

SERVICE=shortlinker
STAGE=dev
USER_TABLE=$SERVICE-userTable-$STAGE
USER_TABLE_EMAIL_IDX=$SERVICE-userTableEmailIndex-$STAGE
SHORTLINK_TABLE=$SERVICE-shortLinkTable-$STAGE
SHORTLINK_TABLE_USER_IDX=$SERVICE-shortLinkTableUserIndex-$STAGE
VIEW_TABLE=$SERVICE-viewTable-$STAGE
VIEW_TABLE_LINK_IDX=$SERVICE-viewTableLinkIndex-$STAGE

aws dynamodb delete-table --table-name $USER_TABLE --endpoint-url http://localhost:8000
aws dynamodb delete-table --table-name $SHORTLINK_TABLE --endpoint-url http://localhost:8000
aws dynamodb delete-table --table-name $VIEW_TABLE --endpoint-url http://localhost:8000

aws dynamodb create-table \
  --table-name $USER_TABLE \
  --attribute-definitions AttributeName=userId,AttributeType=S AttributeName=email,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --global-secondary-indexes IndexName=$USER_TABLE_EMAIL_IDX,KeySchema=["{AttributeName=email,KeyType=HASH}"],Projection="{ProjectionType=ALL}" \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000

aws dynamodb create-table \
  --table-name $SHORTLINK_TABLE \
  --attribute-definitions AttributeName=linkId,AttributeType=S AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=linkId,KeyType=HASH \
  --global-secondary-indexes IndexName=$SHORTLINK_TABLE_USER_IDX,KeySchema=["{AttributeName=userId,KeyType=HASH}"],Projection="{ProjectionType=ALL}" \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000

aws dynamodb create-table \
  --table-name $VIEW_TABLE \
  --attribute-definitions AttributeName=viewId,AttributeType=S AttributeName=linkId,AttributeType=S \
  --key-schema AttributeName=viewId,KeyType=HASH \
  --global-secondary-indexes IndexName=$VIEW_TABLE_LINK_IDX,KeySchema=["{AttributeName=linkId,KeyType=HASH}"],Projection="{ProjectionType=ALL}" \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000

