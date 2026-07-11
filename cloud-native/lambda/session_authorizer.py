# lambda/session_authorizer.py
import boto3
import time
import os

dynamodb = boto3.resource("dynamodb")
SESSION_TABLE = os.environ.get('SESSION_TABLE', 'civil-registry-sessions')
session_table = dynamodb.Table(SESSION_TABLE)

TOKEN_HEADER = "x-session-token"

def get_token(event):
    # REST APIs pass headers through with the client's original casing,
    # so match case-insensitively rather than assuming one spelling.
    for name, value in event.get("headers", {}).items():
        if name.lower() == TOKEN_HEADER:
            return value
    return None

def handler(event, context):
    token = get_token(event)

    method_arn = event["methodArn"]

    if not token:
        return generate_policy("Deny", method_arn)

    response = session_table.get_item(Key={"sessionToken": token})
    item = response.get("Item")

    if not item:
        return generate_policy("Deny", method_arn)

    # Explicit expiry check — don't rely solely on DynamoDB TTL,
    # since TTL deletion isn't instant (can lag by minutes)
    if int(item.get("expires_at", 0)) < int(time.time()):
        return generate_policy("Deny", method_arn)

    # The OTP flow only ever proves ownership of an email address, so the email
    # *is* the citizen's identity. Mapping it to citizenId here keeps that
    # decision in one place — downstream Lambdas only ever read citizenId, so
    # introducing a real citizen ID later means changing this function alone.
    email = item.get("email")
    if not email:
        return generate_policy("Deny", method_arn)

    # Pass identity info to the downstream Lambda via context
    return generate_policy(
        "Allow",
        method_arn,
        context={
            "citizenId": email,
            "email": email
        }
    )

def generate_policy(effect, method_arn, context=None):
    policy = {
        "principalId": "citizen-user",
        "policyDocument": {
            "Version": "2012-10-17",
            "Statement": [{
                "Action": "execute-api:Invoke",
                "Effect": effect,
                "Resource": method_arn
            }]
        }
    }
    if context:
        # All values must be flat strings/numbers/booleans — no nested objects
        policy["context"] = context
    return policy