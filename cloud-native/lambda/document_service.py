import json
import boto3
import os
import uuid
from botocore.config import Config

# SigV4 is required for presigned POST policies to be honoured.
s3_client = boto3.client('s3', config=Config(signature_version='s3v4'))

DOCUMENTS_BUCKET = os.environ.get('DOCUMENTS_BUCKET')
ADMIN_USER_POOL_ID = os.environ.get('ADMIN_USER_POOL_ID', '')

# The upload URL is handed straight to the browser, so keep its life short.
UPLOAD_URL_TTL_SECONDS = 300
DOWNLOAD_URL_TTL_SECONDS = 300

MAX_DOCUMENT_BYTES = 10 * 1024 * 1024

# A presigned POST can constrain content type and size; a presigned PUT cannot.
# That is the whole reason this uses POST.
ALLOWED_CONTENT_TYPES = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
}

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,X-Session-Token,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
}


def respond(status, body):
    return {'statusCode': status, 'headers': CORS_HEADERS, 'body': json.dumps(body)}


def handle_create_upload(event):
    """Citizen asks for somewhere to put their supporting document."""
    citizen_id = event.get('requestContext', {}).get('authorizer', {}).get('citizenId')
    if not citizen_id:
        return respond(401, {'message': 'Unauthorized: no citizen identity in request context'})

    body = json.loads(event.get('body', '{}'))
    content_type = body.get('contentType')

    if content_type not in ALLOWED_CONTENT_TYPES:
        return respond(400, {
            'message': f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}"
        })

    extension = ALLOWED_CONTENT_TYPES[content_type]
    # The key is derived server-side and namespaced by the caller's identity, so
    # a citizen can neither choose their own key nor write under someone else's.
    document_key = f"{citizen_id}/{uuid.uuid4()}{extension}"

    presigned = s3_client.generate_presigned_post(
        Bucket=DOCUMENTS_BUCKET,
        Key=document_key,
        Fields={'Content-Type': content_type},
        Conditions=[
            {'Content-Type': content_type},
            ['content-length-range', 1, MAX_DOCUMENT_BYTES],
        ],
        ExpiresIn=UPLOAD_URL_TTL_SECONDS,
    )

    return respond(200, {
        'uploadUrl': presigned['url'],
        'fields': presigned['fields'],
        'documentKey': document_key,
        'maxBytes': MAX_DOCUMENT_BYTES,
    })


def handle_create_download(event):
    """Officer asks to view a document attached to an application."""
    claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
    issuer = claims.get('iss', '')

    if not ADMIN_USER_POOL_ID or ADMIN_USER_POOL_ID not in issuer:
        return respond(403, {'message': 'Forbidden: Only registry officers can retrieve documents'})

    query_params = event.get('queryStringParameters') or {}
    document_key = query_params.get('key')
    if not document_key:
        return respond(400, {'message': 'key is required'})

    try:
        s3_client.head_object(Bucket=DOCUMENTS_BUCKET, Key=document_key)
    except Exception:
        return respond(404, {'message': 'Document not found'})

    download_url = s3_client.generate_presigned_url(
        'get_object',
        Params={'Bucket': DOCUMENTS_BUCKET, 'Key': document_key},
        ExpiresIn=DOWNLOAD_URL_TTL_SECONDS,
    )

    return respond(200, {'downloadUrl': download_url})


def handler(event, context):
    try:
        method = event.get('httpMethod')
        if method == 'POST':
            return handle_create_upload(event)
        if method == 'GET':
            return handle_create_download(event)
        return respond(405, {'message': 'Method not allowed'})
    except Exception as e:
        print(f"Error: {str(e)}")
        return respond(500, {'message': 'Internal server error'})
