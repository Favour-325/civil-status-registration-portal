import json
import boto3
import os
import hmac
import secrets
import time

from mailer import send_email, MailError

dynamodb = boto3.resource('dynamodb')
OTP_TABLE = os.environ.get('OTP_TABLE', 'civil-registry-otps')
SESSION_TABLE = os.environ.get('SESSION_TABLE', 'civil-registry-sessions')

otp_table = dynamodb.Table(OTP_TABLE)
session_table = dynamodb.Table(SESSION_TABLE)

# How long a code is usable.
OTP_TTL_SECONDS = 300
# Minimum gap between two /send calls for one email. Mirrors RESEND_COOLDOWN in
# the citizens portal's verify-otp page.
RESEND_COOLDOWN_SECONDS = 30
# A rolling window capping how many codes one email can be sent.
SEND_WINDOW_SECONDS = 900
MAX_SENDS_PER_WINDOW = 5
# Wrong guesses allowed against a single code before it is locked.
MAX_VERIFY_ATTEMPTS = 5
SESSION_TTL_SECONDS = 3600 * 24

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    # Without this the browser hides Retry-After from the page's JS.
    "Access-Control-Expose-Headers": "Retry-After"
}

# Deliberately identical for "no such code", "wrong code" and "expired code", so
# the response can't be used to probe which emails have a code outstanding.
INVALID_CODE_MESSAGE = 'Invalid or expired code'


def respond(status, body, extra_headers=None):
    headers = dict(CORS_HEADERS)
    if extra_headers:
        headers.update(extra_headers)
    return {'statusCode': status, 'headers': headers, 'body': json.dumps(body)}


def generate_otp():
    # secrets, not random: random is a Mersenne Twister, whose output is
    # predictable from previous draws within the same warm Lambda container.
    return f"{secrets.randbelow(1_000_000):06d}"


def send_otp_email(receiver_email, otp):
    try:
        send_email(
            receiver_email,
            "Your Civil Registry Portal Verification Code",
            f"Your verification code is: {otp}. Please enter this code on the verification page."
        )
        return True
    except MailError as e:
        print(f"SMTP Error: {e}")
        return False


def handle_send(email):
    now = int(time.time())
    existing = otp_table.get_item(Key={'email': email}).get('Item')

    window_start = now
    send_count = 0

    if existing:
        since_last = now - int(existing.get('last_sent_at', 0))
        if since_last < RESEND_COOLDOWN_SECONDS:
            wait = RESEND_COOLDOWN_SECONDS - since_last
            return respond(
                429,
                {'message': f'Please wait {wait} seconds before requesting another code.'},
                {'Retry-After': str(wait)}
            )

        prior_window_start = int(existing.get('send_window_start', 0))
        if now - prior_window_start < SEND_WINDOW_SECONDS:
            # Still inside the window: carry its start and count forward.
            window_start = prior_window_start
            send_count = int(existing.get('send_count', 0))
            if send_count >= MAX_SENDS_PER_WINDOW:
                wait = (prior_window_start + SEND_WINDOW_SECONDS) - now
                return respond(
                    429,
                    {'message': 'Too many codes requested. Please try again later.'},
                    {'Retry-After': str(wait)}
                )

    otp = generate_otp()

    otp_table.put_item(Item={
        'email': email,
        'otp': otp,
        'otp_expires_at': now + OTP_TTL_SECONDS,
        'attempts': 0,
        'send_count': send_count + 1,
        'send_window_start': window_start,
        'last_sent_at': now,
        # The table's TTL attribute. It tracks the throttling window, not the
        # code: if the record died with the code, requesting a fresh one would
        # reset send_count and the rate limit would be trivially bypassed.
        'expires_at': window_start + SEND_WINDOW_SECONDS,
    })

    if not send_otp_email(email, otp):
        return respond(500, {'message': 'Failed to send email'})

    return respond(200, {'message': 'OTP sent successfully'})


def handle_verify(email, code):
    now = int(time.time())
    item = otp_table.get_item(Key={'email': email}).get('Item')

    if not item:
        return respond(400, {'message': INVALID_CODE_MESSAGE})

    # Lock the code, but keep the record: deleting it here would also discard
    # send_count, letting an attacker reset their rate limit by guessing wrong.
    if int(item.get('attempts', 0)) >= MAX_VERIFY_ATTEMPTS:
        return respond(429, {'message': 'Too many incorrect attempts. Request a new code.'})

    if now > int(item.get('otp_expires_at', 0)):
        return respond(400, {'message': INVALID_CODE_MESSAGE})

    # Constant-time: a plain != leaks the shared prefix length through timing.
    if not hmac.compare_digest(str(item.get('otp', '')), str(code)):
        otp_table.update_item(
            Key={'email': email},
            UpdateExpression='ADD attempts :one',
            ExpressionAttributeValues={':one': 1}
        )
        return respond(400, {'message': INVALID_CODE_MESSAGE})

    # Single use. Consume the code before minting a session so a replay of the
    # same request cannot mint a second one.
    otp_table.delete_item(Key={'email': email})

    session_token = secrets.token_hex(32)
    session_table.put_item(Item={
        'sessionToken': session_token,
        'email': email,
        'expires_at': now + SESSION_TTL_SECONDS
    })

    return respond(200, {
        'message': 'Verified successfully',
        'sessionToken': session_token
    })


def handler(event, context):
    path = event.get('path')
    http_method = event.get('httpMethod')

    try:
        if path.endswith('/send') and http_method == 'POST':
            body = json.loads(event.get('body', '{}'))
            email = body.get('email')
            if not email:
                return respond(400, {'message': 'Email is required'})
            return handle_send(email)

        elif path.endswith('/verify') and http_method == 'POST':
            body = json.loads(event.get('body', '{}'))
            email = body.get('email')
            code = body.get('code')
            if not email or not code:
                return respond(400, {'message': 'Email and code are required'})
            return handle_verify(email, code)

        return respond(404, {'message': 'Endpoint not found'})

    except Exception as e:
        print(f"System Error: {str(e)}")
        return respond(500, {'message': 'Internal server error'})
