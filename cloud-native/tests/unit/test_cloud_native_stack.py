import aws_cdk as core
import aws_cdk.assertions as assertions

from cloud_native.cloud_native_stack import CloudNativeStack

# example tests. To run these tests, uncomment this file along with the example
# resource in cloud_native/cloud_native_stack.py
def test_sqs_queue_created():
    app = core.App()
    stack = CloudNativeStack(app, "cloud-native")
    template = assertions.Template.from_stack(stack)

#     template.has_resource_properties("AWS::SQS::Queue", {
#         "VisibilityTimeout": 300
#     })
