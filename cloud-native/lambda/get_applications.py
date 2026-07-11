import json
import boto3
import os
from boto3.dynamodb.conditions import Attr

# Initialize DynamoDB client outside the handler for connection reuse
dynamodb = boto3.resource('dynamodb')
TABLE_NAME = os.environ.get('APPLICATIONS_TABLE')
table = dynamodb.Table(TABLE_NAME)

# Proxy integrations don't inherit the API's CORS preflight config, so the
# function has to return these on the actual response itself.
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,GET"
}

def handler(event, context):
    try:
        # Get user claims from Cognito authorizer
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        issuer = claims.get('iss', '')
        admin_pool_id = os.environ.get('ADMIN_USER_POOL_ID', '')

        # Authorization: Only users from the Admin User Pool should be able to retrieve application lists
        if admin_pool_id not in issuer:
            return {
                'statusCode': 403,
                'headers': CORS_HEADERS,
                'body': json.dumps({'message': 'Forbidden: Only registry officers can retrieve application records'})
            }

        # API Gateway sends queryStringParameters as null (not absent) when the
        # request has no query string, so a dict default would never apply.
        query_params = event.get('queryStringParameters') or {}
        status_filter = query_params.get('status')

        # Scan is fine for low-volume admin lists; a GSI on 'status' would be the
        # production answer. But a scan returns at most 1MB per call, so it must
        # be drained: reading only the first page silently hides applications
        # from the officer, with no error to notice.
        scan_kwargs = {}
        if status_filter:
            scan_kwargs['FilterExpression'] = Attr('status').eq(status_filter)

        items = []
        while True:
            response = table.scan(**scan_kwargs)
            items.extend(response.get('Items', []))

            last_key = response.get('LastEvaluatedKey')
            if not last_key:
                break
            scan_kwargs['ExclusiveStartKey'] = last_key

        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            # DynamoDB deserialises numbers as Decimal, which json can't encode.
            'body': json.dumps({
                'count': len(items),
                'applications': items
            }, default=str)
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'message': 'Internal server error'})
        }
