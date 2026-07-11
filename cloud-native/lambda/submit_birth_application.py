import json
import boto3
import uuid
from datetime import datetime
import os

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
    "Access-Control-Allow-Headers": "Content-Type,X-Session-Token",
    "Access-Control-Allow-Methods": "OPTIONS,POST"
}

# Mirrors the fields the application wizard blocks on for a subtype=new birth
# application. Anything else it collects (childGender, fatherPhone, ...) is
# optional and stored as-is.
REQUIRED_FIELDS = [
    'childFirstName', 'childDateOfBirth', 'placeOfBirth',
    'fatherFirstName', 'fatherLastName', 'fatherDateOfBirth',
    'fatherPlaceOfBirth', 'fatherResidence', 'fatherOccupation', 'fatherNationality',
    'motherFirstName', 'motherLastName', 'motherDateOfBirth',
    'motherPlaceOfBirth', 'motherResidence', 'motherOccupation', 'motherNationality',
]

def validate_birth_data(data):
    for field in REQUIRED_FIELDS:
        if field not in data or not data[field]:
            raise ValueError(f"Missing required field for birth application: {field}")

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

        # Validate birth data
        validate_birth_data(app_data)

        # The wizard makes the supporting document mandatory, so the API does too.
        document_key = body.get('documentKey')
        if not document_key:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'message': 'Missing documentKey: a supporting document is required'})
            }

        # document_service namespaces every key under the uploader's citizenId.
        # Re-checking it here stops a citizen attaching someone else's document.
        if not document_key.startswith(f"{citizen_id}/"):
            return {
                'statusCode': 403,
                'headers': CORS_HEADERS,
                'body': json.dumps({'message': 'Forbidden: documentKey does not belong to this citizen'})
            }

        # Generate unique application ID and timestamp
        application_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat()

        # Construct the DynamoDB item
        item = {
            'citizenId': citizen_id,
            'applicationId': application_id,
            'documentKey': document_key,
            'type': 'birth',
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
            'type': 'birth',
            'applicationId': application_id,
            'citizenId': citizen_id,
            'timestamp': created_at
        })

        return {
            'statusCode': 201,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'message': 'Birth application submitted successfully',
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
