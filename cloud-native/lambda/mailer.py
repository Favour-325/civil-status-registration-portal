import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import boto3

SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '465'))
SMTP_SECRET_ARN = os.environ.get('SMTP_SECRET_ARN')

SMTP_TIMEOUT_SECONDS = 10

_secrets_client = boto3.client('secretsmanager')

# Fetched once per container, not per invocation: Secrets Manager is billed per
# API call and adds latency to every send.
_credentials = None


class MailError(Exception):
    """Raised when an email could not be handed to the SMTP server."""


def _load_credentials():
    """Return (username, password) from Secrets Manager, cached per container."""
    global _credentials
    if _credentials is not None:
        return _credentials

    if not SMTP_SECRET_ARN:
        raise MailError('SMTP_SECRET_ARN is not set')

    try:
        secret = _secrets_client.get_secret_value(SecretId=SMTP_SECRET_ARN)
        parsed = json.loads(secret['SecretString'])
        username, password = parsed['username'], parsed['password']
    except Exception as e:
        # Do not chain: a botocore error can echo request contents.
        raise MailError(f"Could not read the SMTP secret ({type(e).__name__})") from None

    if not username or not password:
        raise MailError('The SMTP secret is present but empty — set its value')

    _credentials = (username, password)
    return _credentials


def get_sender_address():
    """The registry's own address — the mailbox contact messages are copied to."""
    return _load_credentials()[0]


def send_email(to_email, subject, body):
    """Send a plain-text email. Raises MailError on any failure.

    Shared by otp_service, notification_service and contact_service so the SMTP
    credential is read in exactly one place.
    """
    username, password = _load_credentials()

    msg = MIMEMultipart()
    msg['From'] = username
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    try:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=SMTP_TIMEOUT_SECONDS) as server:
            server.login(username, password)
            server.send_message(msg)
    except Exception as e:
        # Never let the raw exception escape: it can carry the SMTP dialogue,
        # and on a failed AUTH that dialogue includes the password.
        raise MailError(f"{type(e).__name__} while sending mail") from None
