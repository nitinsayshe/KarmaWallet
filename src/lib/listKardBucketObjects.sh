#!/bin/env bash

issuer_role=$KARD_KARMAWALLET_AWS_ROLE
kard_role=$KARD_AWS_ROLE
env=$KARD_AWS_ENV

session1=$(aws sts assume-role --role-arn ${issuer_role} --role-session-name session-1)
session1_access_key=$(echo ${session1} | jq -r '.Credentials.AccessKeyId')
session1_secret_key=$(echo ${session1} | jq -r '.Credentials.SecretAccessKey')
session1_token=$(echo ${session1} | jq -r '.Credentials.SessionToken')
export AWS_ACCESS_KEY_ID=${session1_access_key}
export AWS_SECRET_ACCESS_KEY=${session1_secret_key}
export AWS_SESSION_TOKEN=${session1_token}

echo $session1

session2=$(aws sts assume-role --role-arn ${kard_role} --role-session-name session-2)
session2_access_key=$(echo ${session2} | jq -r '.Credentials.AccessKeyId')
session2_secret_key=$(echo ${session2} | jq -r '.Credentials.SecretAccessKey')
session2_token=$(echo ${session2} | jq -r '.Credentials.SessionToken')
export AWS_ACCESS_KEY_ID=${session2_access_key}
export AWS_SECRET_ACCESS_KEY=${session2_secret_key}
export AWS_SESSION_TOKEN=${session2_token}

echo $session2

echo "Backup:"
aws s3 ls "s3://rewards-transactions/$KARD_AWS_ENV/kard/reconciliation/karmawallet/daily/backup/"

echo "Upload:"
aws s3 ls "s3://rewards-transactions/$KARD_AWS_ENV/kard/reconciliation/karmawallet/daily/upload/"

