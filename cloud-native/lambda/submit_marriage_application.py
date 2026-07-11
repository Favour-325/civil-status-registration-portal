import json
import boto3
import uuid
from datetime import datetime
import os

from event_publisher import publish

# Initialize clients outside the handler for connection reuse
dynamodb = boto3.resource('dynamodb')
events_client = boto3.client('events')
TABLE_NAME = os.environ.get('APPLICATIONS_TABLE', 'civil-registry-marriage-applications')
EVENT_BUS_NAME = os.environ.get('EVENT_BUS_NAME', 'civil-registry-event-bus')
table = dynamodb.Table(TABLE_NAME)

# Proxy integrations don't inherit the API's CORS preflight config, so the
# function has to return these on the actual response itself.
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,X-Session-Token",
    "Access-Control-Allow-Methods": "OPTIONS,POST"
}

# Mirrors the fields the application wizard blocks on for a subtype=new marriage
# application. Anything else it collects (spouse1Email, spouse2DOB, ...) is
# optional and stored as-is.
REQUIRED_FIELDS = [
    'spouse1FirstName', 'spouse1LastName',
    'spouse2FirstName', 'spouse2LastName',
    'marriageDate', 'marriagePlace',
]

def validate_marriage_data(data):
    for field in REQUIRED_FIELDS:
        if field not in data or not data[field]:
            raise ValueError(f"Missing required field for marriage application: {field}")

def handler(event, context):
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))

        # The session authorizer has already validated the token and resolved
        # the caller's identity; we just read what it passed down.
        citizen_id = event.get('requestContext', {}).get('authorizer', {}).get('citizenId')

        if not citizen_id:
            return {
                'statusCode': 401,
                'headers': CORS_HEADERS,
                'body': json.dumps({'message': 'Unauthorized: no citizen identity in request context'})
            }

        app_data = body.get('applicationData')

        if not app_data:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'message': 'Missing applicationData'})
            }

        # Validate marriage data
        validate_marriage_data(app_data)

        # Generate unique application ID and timestamp
        application_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat()

        # Construct the DynamoDB item
        item = {
            'citizenId': citizen_id,
            'applicationId': application_id,
            'type': 'marriage',
            'data': app_data,
            'status': 'PENDING',
            'createdAt': created_at
        }

        # Save to DynamoDB
        table.put_item(Item=item)

        # The row above is the source of truth. publish() logs and returns False
        # rather than raising, so a lost event can't turn a saved application into
        # a 500 for the citizen.
        publish(events_client, EVENT_BUS_NAME, 'ApplicationSubmitted', {
            'type': 'marriage',
            'applicationId': application_id,
            'citizenId': citizen_id,
            'timestamp': created_at
        })

        return {
            'statusCode': 201,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'message': 'Marriage application submitted successfully',
                'applicationId': application_id
            })
        }

    except ValueError as ve:
        return {
            'statusCode': 400,
            'headers': CORS_HEADERS,
            'body': json.dumps({'message': str(ve)})
        }
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'message': 'Internal server error'})
        }
