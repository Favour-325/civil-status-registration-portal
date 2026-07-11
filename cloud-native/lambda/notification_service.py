import json
import logging

from mailer import send_email, get_sender_address, MailError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

CERTIFICATE_LABEL = {'birth': 'birth certificate', 'marriage': 'marriage certificate'}


def build_emails(detail_type, detail):
    """Return a list of (recipient, subject, body).

    A list rather than a single message because one ContactMessageReceived event
    produces two: an acknowledgement to the sender and a copy to the registry.
    Application events each produce exactly one.

    An empty list means this event warrants no email.
    """
    if detail_type == 'ContactMessageReceived':
        return _contact_emails(detail)

    app_type = detail.get('type')
    app_id = detail.get('applicationId')
    label = CERTIFICATE_LABEL.get(app_type, 'certificate')

    # For application events the citizenId *is* the citizen's email address —
    # see lambda/session_authorizer.py.
    citizen = detail.get('citizenId')
    if not citizen:
        return []

    if detail_type == 'ApplicationSubmitted':
        return [(
            citizen,
            f"We received your {label} application",
            f"Your {label} application has been received and is now pending review.\n\n"
            f"Reference number: {app_id}\n\n"
            "We will email you again once a registry officer has reviewed it."
        )]

    if detail_type == 'ApplicationStatusUpdated':
        status = detail.get('newStatus')
        if status == 'ACCEPTED':
            return [(
                citizen,
                f"Your {label} application was approved",
                f"Good news — your {label} application has been approved.\n\n"
                f"Your certificate is ready to be collected at the Douala IV municipal council.\n\n"
                f"Reference number: {app_id}"
            )]
        if status == 'REJECTED':
            reason = detail.get('reason') or 'No reason was provided.'
            return [(
                citizen,
                f"Your {label} application was not approved",
                f"Your {label} application could not be approved.\n\n"
                f"Reference number: {app_id}\n"
                f"Reason: {reason}\n\n"
                "You may correct the issue above and submit a new application."
            )]
        # An unknown status means a bug upstream. Emailing something vague is
        # worse than staying quiet and leaving a log line to investigate.
        return []

    return []


def _contact_emails(detail):
    sender = detail.get('email')
    if not sender:
        return []

    message_id = detail.get('messageId')
    name = detail.get('name', 'there')
    subject = detail.get('subject') or '(no subject)'
    message = detail.get('message', '')

    acknowledgement = (
        sender,
        "We received your message",
        f"Hello {name},\n\n"
        "Thank you for contacting the Civil Status Registry. Your feedback has been received "
        "and will be treated by a civil agent as soon as possible.\n\n"
        f"Reference number: {message_id}\n\n"
        "There is no need to send your message again."
    )

    registry_copy = (
        # The registry's own mailbox — the address the secret authenticates as.
        get_sender_address(),
        f"[Contact] {subject}",
        f"From: {name} <{sender}>\n"
        f"Reference: {message_id}\n\n"
        f"{message}"
    )

    return [acknowledgement, registry_copy]


def handler(event, context):
    detail_type = event.get('detail-type')
    detail = event.get('detail', {})
    ref = detail.get('applicationId') or detail.get('messageId')

    logger.info(f"Processing {detail_type} for {ref}")

    try:
        # build_emails can itself raise MailError: a contact event resolves the
        # registry recipient via get_sender_address(), which reads the secret.
        # Building and sending share one except so both fail the same way.
        emails = build_emails(detail_type, detail)

        if not emails:
            # Retrying will not conjure a recipient or invent a message body, so
            # don't raise: that would burn the retry budget and park a permanently
            # unsendable event on the DLQ.
            logger.warning(f"No email to send for {detail_type} ({ref})")
            return {'statusCode': 200, 'body': json.dumps({'message': 'No notification for this event'})}

        for recipient, subject, body in emails:
            send_email(recipient, subject, body)
    except MailError as e:
        # Most likely transient. Raising lets EventBridge retry and, failing
        # that, park the event on the dead-letter queue rather than lose it.
        #
        # A retry re-sends every email for the event, so if the acknowledgement
        # succeeded and the registry copy failed, the sender may receive a
        # duplicate acknowledgement. That is preferable to losing the alert that
        # tells a civil agent a message is waiting.
        logger.error(f"Failed to email {detail_type} ({ref}): {e}")
        raise

    logger.info(f"Sent {len(emails)} email(s) for {detail_type} ({ref})")
    return {'statusCode': 200, 'body': json.dumps({'message': 'Notification sent'})}
