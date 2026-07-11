import json
import boto3
import os
from datetime import datetime
from botocore.exceptions import ClientError

from event_publisher import publish

# Initialize clients outside the handler for connection reuse
dynamodb = boto3.resource('dynamodb')
events_client = boto3.client('events')
TABLE_NAME = os.environ.get('APPLICATIONS_TABLE', 'civil-registry-birth-applications')
EVENT_BUS_NAME = os.environ.get('EVENT_BUS_NAME', 'civil-registry-event-bus')
table = dynamodb.Table(TABLE_NAME)

# Proxy integrations don't inherit the API's CORS preflight config, so the
# function has to return these on the actual response itself.
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,PUT"
}

def handler(event, context):
    try:
        # Get user claims from Cognito authorizer
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        issuer = claims.get('iss', '')
        admin_pool_id = os.environ.get('ADMIN_USER_POOL_ID', '')

        # Authorization: Only users from the Admin User Pool can update applications
        if admin_pool_id not in issuer:
            return {
                'statusCode': 403,
                'headers': CORS_HEADERS,
                'body': json.dumps({'message': 'Forbidden: Only registry officers can update application status'})
            }

        # Parse request body
        body = json.loads(event.get('body', '{}'))
        application_id = body.get('applicationId')
        new_status = body.get('status')
        reason = body.get('reason')

        if not application_id or not new_status:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'message': 'Missing applicationId or status'})
            }

        # Validate status values
        if new_status not in ['ACCEPTED', 'REJECTED']:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'message': 'Invalid status. Must be either ACCEPTED or REJECTED'})
            }

        # Validate reason for rejection
        if new_status == 'REJECTED' and not reason:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'message': 'Reason is required when rejecting an application'})
            }

        # citizenId is the table's partition key, but an officer's token doesn't
        # carry it — the client passes it back from the GET listing.
        citizen_id = body.get('citizenId')
        if not citizen_id:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'message': 'citizenId is required to locate the application'})
            }

        # Verify application exists
        response = table.get_item(
            Key={
                'citizenId': citizen_id,
                'applicationId': application_id
            }
        )
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': CORS_HEADERS,
                'body': json.dumps({'message': 'Application not found'})
            }

        # Build the expression and its attribute names together: DynamoDB rejects
        # an ExpressionAttributeName that the expression never references.
        update_expr = "set #s = :val_s"
        attr_names = {"#s": "status"}
        attr_vals = {":val_s": new_status, ":pending": 'PENDING'}

        if reason:
            update_expr += ", #r = :val_r"
            attr_names["#r"] = "reason"
            attr_vals[":val_r"] = reason

        try:
            table.update_item(
                Key={
                    'citizenId': citizen_id,
                    'applicationId': application_id
                },
                UpdateExpression=update_expr,
                # A decision is final. The condition is evaluated by DynamoDB as
                # part of the write, so two officers deciding at once cannot both
                # observe PENDING and both succeed — one of them loses here.
                ConditionExpression="#s = :pending",
                ExpressionAttributeNames=attr_names,
                ExpressionAttributeValues=attr_vals
            )
        except ClientError as e:
            if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
                return {
                    'statusCode': 409,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'message': 'This application has already been decided'})
                }
            raise

        # The write above is the source of truth. publish() logs and returns False
        # rather than raising — reporting 500 here would tell the officer the
        # update was rejected when it has already been applied.
        publish(events_client, EVENT_BUS_NAME, 'ApplicationStatusUpdated', {
            'type': 'birth',
            'applicationId': application_id,
            'citizenId': citizen_id,
            'newStatus': new_status,
            'reason': reason,
            'timestamp': datetime.utcnow().isoformat()
        })

        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'message': f'Birth application marked as {new_status} successfully'
            })
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'message': 'Internal server error'})
        }
