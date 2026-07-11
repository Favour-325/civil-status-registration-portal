import json
import boto3
import os
import re
import time
import uuid
from datetime import datetime

from event_publisher import publish

dynamodb = boto3.resource('dynamodb')
events_client = boto3.client('events')

MESSAGES_TABLE = os.environ.get('MESSAGES_TABLE', 'civil-registry-messages')
EVENT_BUS_NAME = os.environ.get('EVENT_BUS_NAME', 'civil-registry-event-bus')

messages_table = dynamodb.Table(MESSAGES_TABLE)

# This endpoint is unauthenticated, so everything is bounded before it is stored.
MAX_NAME_LENGTH = 120
MAX_SUBJECT_LENGTH = 200
MAX_MESSAGE_LENGTH = 5000
MAX_EMAIL_LENGTH = 254  # RFC 5321

# Same shape as otp_service.handle_send: a cooldown plus a rolling window cap.
SEND_COOLDOWN_SECONDS = 60
SEND_WINDOW_SECONDS = 3600
MAX_SENDS_PER_WINDOW = 5

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Access-Control-Expose-Headers": "Retry-After"
}


def respond(status, body, extra_headers=None):
    headers = dict(CORS_HEADERS)
    if extra_headers:
        headers.update(extra_headers)
    return {'statusCode': status, 'headers': headers, 'body': json.dumps(body)}


def validate(body):
    """Return (name, email, subject, message). Raises ValueError with a safe message."""
    name = (body.get('name') or '').strip()
    email = (body.get('email') or '').strip()
    subject = (body.get('subject') or '').strip()
    message = (body.get('message') or '').strip()

    if not name:
        raise ValueError('Your name is required')
    if len(name) > MAX_NAME_LENGTH:
        raise ValueError(f'Name must be {MAX_NAME_LENGTH} characters or fewer')

    if not email:
        raise ValueError('Your email address is required')
    if len(email) > MAX_EMAIL_LENGTH or not EMAIL_PATTERN.match(email):
        raise ValueError('Please provide a valid email address')

    if len(subject) > MAX_SUBJECT_LENGTH:
        raise ValueError(f'Subject must be {MAX_SUBJECT_LENGTH} characters or fewer')

    if not message:
        raise ValueError('A message is required')
    if len(message) > MAX_MESSAGE_LENGTH:
        raise ValueError(f'Message must be {MAX_MESSAGE_LENGTH} characters or fewer')

    return name, email, subject, message


def check_rate_limit(email, now):
    """Return a 429 response if this sender is going too fast, else None."""
    # The sender's own throttle record is keyed on their email; a successful send
    # rewrites it, so the counters carry forward across messages.
    existing = messages_table.get_item(Key={'messageId': f"rate#{email}"}).get('Item')
    if not existing:
        return None, now, 0

    since_last = now - int(existing.get('last_sent_at', 0))
    if since_last < SEND_COOLDOWN_SECONDS:
        wait = SEND_COOLDOWN_SECONDS - since_last
        return respond(
            429,
            {'message': f'Please wait {wait} seconds before sending another message.'},
            {'Retry-After': str(wait)}
        ), None, None

    window_start = int(existing.get('send_window_start', 0))
    send_count = int(existing.get('send_count', 0))

    if now - window_start >= SEND_WINDOW_SECONDS:
        return None, now, 0

    if send_count >= MAX_SENDS_PER_WINDOW:
        wait = (window_start + SEND_WINDOW_SECONDS) - now
        return respond(
            429,
            {'message': 'Too many messages sent. Please try again later.'},
            {'Retry-After': str(wait)}
        ), None, None

    return None, window_start, send_count


def handler(event, context):
    try:
        if event.get('httpMethod') != 'POST':
            return respond(405, {'message': 'Method not allowed'})

        body = json.loads(event.get('body', '{}'))

        try:
            name, email, subject, message = validate(body)
        except ValueError as ve:
            return respond(400, {'message': str(ve)})

        now = int(time.time())
        limited, window_start, send_count = check_rate_limit(email, now)
        if limited:
            return limited

        message_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat()

        messages_table.put_item(Item={
            'messageId': message_id,
            'name': name,
            'email': email,
            'subject': subject or '(no subject)',
            'message': message,
            'status': 'NEW',
            'createdAt': created_at
        })

        messages_table.put_item(Item={
            'messageId': f"rate#{email}",
            'last_sent_at': now,
            'send_window_start': window_start,
            'send_count': send_count + 1,
            # The rate record is throwaway state; let DynamoDB reap it.
            'expires_at': window_start + SEND_WINDOW_SECONDS
        })

        # The row above is the source of truth. A failed publish means no emails
        # go out, but the message is stored and the log line says why.
        publish(events_client, EVENT_BUS_NAME, 'ContactMessageReceived', {
            'messageId': message_id,
            'name': name,
            'email': email,
            'subject': subject or '(no subject)',
            'message': message,
            'timestamp': created_at
        })

        return respond(201, {
            'message': 'Your message has been received.',
            'messageId': message_id
        })

    except Exception as e:
        print(f"Error: {str(e)}")
        return respond(500, {'message': 'Internal server error'})
