import json

SOURCE = 'civil.registry.service'

# One greppable prefix across every publisher, so CloudWatch Logs Insights can
# find dropped events without knowing which function lost them.
FAILURE_PREFIX = 'EVENT_PUBLISH_FAILED'


def publish(events_client, bus_name, detail_type, detail):
    """Publish one event to the bus. Returns True if EventBridge accepted it.

    Never raises. Two things make a dropped event invisible otherwise:

    1. put_events does NOT raise when an entry is rejected — it returns HTTP 200
       with FailedEntryCount >= 1 and a per-entry ErrorCode. Callers that only
       check for exceptions lose the event silently.
    2. Callers publish *after* writing to DynamoDB. Letting an exception escape
       would report a 500 for a write that already succeeded.

    So the caller's row is the source of truth and this returns a bool. A false
    return means: the write stands, the notification did not go out, and there is
    a log line saying why.
    """
    # Never log `detail` itself: it carries the citizen's email and, for contact
    # messages, their name and free text.
    ref = detail.get('applicationId') or detail.get('messageId') or '-'

    try:
        response = events_client.put_events(Entries=[{
            'Source': SOURCE,
            'DetailType': detail_type,
            'Detail': json.dumps(detail),
            'EventBusName': bus_name,
        }])
    except Exception as e:
        print(f"{FAILURE_PREFIX} type={detail_type} ref={ref} raised={type(e).__name__}: {e}")
        return False

    if response.get('FailedEntryCount', 0):
        entry = (response.get('Entries') or [{}])[0]
        print(f"{FAILURE_PREFIX} type={detail_type} ref={ref} "
              f"code={entry.get('ErrorCode')} message={entry.get('ErrorMessage')}")
        return False

    return True
