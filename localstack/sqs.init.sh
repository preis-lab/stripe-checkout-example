#!/bin/bash

set -euo pipefail

echo "==================="
echo "Creating SQS Queues"

LOCALSTACK_HOST=localstack
AWS_REGION=us-east-1

aws configure set aws_access_key_id default_access_key --profile=localstack
aws configure set aws_secret_access_key default_secret_key --profile=localstack
aws configure set region $AWS_REGION

ENVRIONMENTS=("docker" "development")
QUEUES=(
    "backend-sync-account-queue" 
    "backend-email-metadata-queue" 
    "backend-delete-account-queue" 
    "backend-email-queue" 
    "backend-stripe-webhooks-queue"
    "backend-email-updated-queue"
)

create_queue() {
    local QUEUE_NAME_TO_CREATE=$1
    aws --endpoint-url=http://${LOCALSTACK_HOST}:4566 sqs create-queue --queue-name ${QUEUE_NAME_TO_CREATE} --region ${AWS_REGION} --profile=localstack
}

for ENV in "${ENVRIONMENTS[@]}"; do 
    for QUEUE in "${QUEUES[@]}"; do
        create_queue "${ENV}-${QUEUE}"
    done
done

echo "Finish creating SQS Queues"
echo "==================="