import json

from aws_cdk import (
    CfnOutput,
    Duration,
    Stack,
    RemovalPolicy,
    aws_lambda as lambda_,
    aws_sqs as sqs,
    aws_events as events,
    aws_events_targets as targets,
    aws_cognito as cognito,
    aws_dynamodb as dynamodb,
    aws_apigateway as apigateway,
    aws_secretsmanager as secretsmanager,
    aws_s3 as s3
)
from constructs import Construct

# Where the admin portal runs. Cognito matches callback URLs exactly, so this
# has to agree with amplify-config.ts and with next dev's port.
ADMIN_PORTAL_URL = "http://localhost:3001"

# The citizens portal uploads supporting documents straight to S3, so its origin
# has to be on the bucket's CORS allow-list.
CITIZEN_PORTAL_URL = "http://localhost:3000"

# Cognito hosted-UI domain prefixes are globally unique per region. The citizen
# pool already holds "ccsrp".
ADMIN_DOMAIN_PREFIX = "ccsrp-admin"

class CloudNativeStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # The code that defines your stack goes here

        # example resource
        # queue = sqs.Queue(
        #     self, "CloudNativeQueue",
        #     visibility_timeout=Duration.seconds(300),
        # )

        # --- Authentication Infrastructure ---
        
        # 1. Admin User Pool (Standard Flow with Hosted UI)
        admin_user_pool = cognito.UserPool(
            self, "AdminUserPool",
            user_pool_name = "civil-registry-admin-pool",
            self_sign_up_enabled = False, # Admins are created by other admins
            sign_in_aliases = cognito.SignInAliases(email = True),
            auto_verify = cognito.AutoVerifiedAttrs(email = True),
            password_policy = cognito.PasswordPolicy(
                min_length = 12,
                require_lowercase = True,
                require_uppercase = True,
                require_digits = True,
                require_symbols = True
            )
        )

        # The hosted UI needs a domain, and a domain belongs to exactly one user
        # pool — the admin pool can't borrow the citizen pool's.
        admin_domain = admin_user_pool.add_domain(
            "AdminUserPoolDomain",
            cognito_domain = cognito.CognitoDomainOptions(domain_prefix = ADMIN_DOMAIN_PREFIX)
        )

        admin_client = admin_user_pool.add_client(
            "AdminWebClient",
            user_pool_client_name = "civil-registry-admin-client",
            auth_flows = cognito.AuthFlow(user_password = True),
            # The admin portal is a browser SPA and authenticates with PKCE, which
            # a client secret makes impossible — Amplify has nowhere safe to keep
            # one. This must stay False.
            generate_secret = False,
            o_auth = cognito.OAuthSettings(
                flows = cognito.OAuthFlows(authorization_code_grant = True),
                scopes = [
                    cognito.OAuthScope.EMAIL,
                    cognito.OAuthScope.OPENID,
                    cognito.OAuthScope.PHONE,
                    cognito.OAuthScope.COGNITO_ADMIN,
                ],
                # Must match lib/amplify-config.ts exactly, or Cognito rejects the
                # redirect with redirect_mismatch.
                callback_urls = [f"{ADMIN_PORTAL_URL}/auth/callback"],
                logout_urls = [f"{ADMIN_PORTAL_URL}/"],
            )
        )

        # 2. Citizen User Pool (Custom OTP Flow)
        citizen_user_pool = cognito.UserPool(
            self, "CitizenUserPool",
            user_pool_name = "civil-registry-citizen-pool",
            self_sign_up_enabled = True,
            sign_in_aliases = cognito.SignInAliases(email = True),
            # We disable standard password auth for citizens to force OTP
            # Note: To fully enforce custom auth, we use the Lambda triggers
        )

        citizen_client = citizen_user_pool.add_client(
            "CitizenWebClient",
            user_pool_client_name = "civil-registry-citizen-client",
            auth_flows = cognito.AuthFlow(custom = True),
            generate_secret = False
        )

        # NOTE: this pool and client are inert. Citizens authenticate through
        # otp_service.py + session_authorizer.py, not Cognito. The custom-auth
        # challenge triggers that once hung off this pool have been removed:
        # nothing invoked them, yet they carried ses:SendEmail on "*" and Lambda
        # invoke permissions with no source_arn, meaning any Cognito user pool in
        # any AWS account could call them.

        # Table for OTP storage
        otp_table = dynamodb.Table(
            self, "OtpStorageTable",
            table_name = "civil-registry-otps",
            partition_key = dynamodb.Attribute(name = "email", type = dynamodb.AttributeType.STRING),
            billing_mode = dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy = RemovalPolicy.DESTROY,
            time_to_live_attribute = "expires_at"
        )

        # Table for Session storage
        session_table = dynamodb.Table(
            self, "SessionStorageTable",
            table_name = "civil-registry-sessions",
            partition_key = dynamodb.Attribute(name = "sessionToken", type = dynamodb.AttributeType.STRING),
            billing_mode = dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy = RemovalPolicy.DESTROY,
            time_to_live_attribute = "expires_at"
        )

        # Stores user metadata linked to cognito
        profiles_table = dynamodb.Table(
            self, "UserProfilesTable",
            table_name = "civil-registry-profiles",
            partition_key = dynamodb.Attribute(
                name = "userId",
                type = dynamodb.AttributeType.STRING
            ),
            billing_mode = dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy = RemovalPolicy.DESTROY
        )

        # Table for birth certificate applications
        birth_applications_table = dynamodb.Table(
            self, "BirthCertificatesApplicationsTable",
            table_name = "civil-registry-birth-applications",
            partition_key = dynamodb.Attribute(
                name = "citizenId",
                type = dynamodb.AttributeType.STRING
            ),
            sort_key = dynamodb.Attribute(
                name = "applicationId",
                type = dynamodb.AttributeType.STRING
            ),
            billing_mode = dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy = RemovalPolicy.DESTROY
        )

        # Table for marriage certificate applications
        marriage_applications_table = dynamodb.Table(
            self, "MarriageCertificatesApplicationsTable",
            table_name = "civil-registry-marriage-applications",
            partition_key = dynamodb.Attribute(
                name = "citizenId",
                type = dynamodb.AttributeType.STRING
            ),
            sort_key = dynamodb.Attribute(
                name = "applicationId",
                type = dynamodb.AttributeType.STRING
            ),
            billing_mode = dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy = RemovalPolicy.DESTROY
        )

        # The SMTP credential. CDK only seeds a placeholder: an empty username and
        # a randomly generated `password`, so no real credential ever lives in this
        # repository or in a CloudFormation template. Set the real value after
        # deploying, out of band and authoritatively:
        #
        #   aws secretsmanager put-secret-value --secret-id civil-registry/smtp \
        #     --secret-string '{"username":"<gmail address>","password":"<app password>"}'
        #
        # generate_string_key is the JSON KEY NAME for the generated value, not the
        # value — it must stay "password". Do not put a credential here, and do not
        # change this block once deployed: editing GenerateSecretString makes
        # CloudFormation regenerate the value and silently breaks email.
        smtp_secret = secretsmanager.Secret(
            self, "SmtpSecret",
            secret_name = "civil-registry/smtp",
            description = "SMTP credentials used to send OTP, notification and contact emails",
            generate_secret_string = secretsmanager.SecretStringGenerator(
                secret_string_template = json.dumps({"username": ""}),
                generate_string_key = "password",
                exclude_punctuation = True
            ),
            removal_policy = RemovalPolicy.DESTROY
        )

        # Only lambda/mailer.py reads this, and only from Secrets Manager.
        smtp_environment = {
            "SMTP_SECRET_ARN": smtp_secret.secret_arn
        }

        # OTP Service Lambda (SMTP approach)
        otp_service_lambda = lambda_.Function(
            self, "OtpServiceLambda",
            runtime = lambda_.Runtime.PYTHON_3_9,
            handler = "otp_service.handler",
            code = lambda_.Code.from_asset("lambda"),
            # The default 3s is not enough for an SMTP_SSL handshake plus AUTH.
            timeout = Duration.seconds(30),
            environment = {
                "OTP_TABLE": otp_table.table_name,
                "SESSION_TABLE": session_table.table_name,
                **smtp_environment
            }
        )
        otp_table.grant_read_write_data(otp_service_lambda)
        session_table.grant_read_write_data(otp_service_lambda)
        smtp_secret.grant_read(otp_service_lambda)

        # Contact messages from the citizens portal's "Get in Touch" form.
        messages_table = dynamodb.Table(
            self, "ContactMessagesTable",
            table_name = "civil-registry-messages",
            partition_key = dynamodb.Attribute(
                name = "messageId",
                type = dynamodb.AttributeType.STRING
            ),
            billing_mode = dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy = RemovalPolicy.DESTROY,
            # Only the throwaway "rate#<email>" throttle records carry expires_at;
            # the messages themselves have none and are kept.
            time_to_live_attribute = "expires_at"
        )

        # Public endpoint: it stores the message and publishes an event. It sends
        # no mail itself — notification_service owns every outbound email.
        contact_service_lambda = lambda_.Function(
            self, "ContactServiceLambda",
            runtime = lambda_.Runtime.PYTHON_3_9,
            handler = "contact_service.handler",
            code = lambda_.Code.from_asset("lambda"),
            environment = {
                "MESSAGES_TABLE": messages_table.table_name,
                "EVENT_BUS_NAME": "civil-registry-event-bus"
            }
        )
        messages_table.grant_read_write_data(contact_service_lambda)

        session_authorizer_lambda = lambda_.Function(
            self, "SessionAuthorizerLambda",
            runtime = lambda_.Runtime.PYTHON_3_9,
            handler = "session_authorizer.handler",
            code = lambda_.Code.from_asset("lambda"),
            environment = {
                "SESSION_TABLE": session_table.table_name
            }
        )
        session_table.grant_read_data(session_authorizer_lambda)

        session_authorizer = apigateway.RequestAuthorizer(
            self, "SessionTokenAuthorizer",
            handler = session_authorizer_lambda,
            identity_sources = [apigateway.IdentitySource.header("X-Session-Token")],
            results_cache_ttl = Duration.seconds(0)
        )

        # Lambda function to handle birth application submissions
        submit_birth_application_lambda = lambda_.Function(
            self, "SubmitBirthApplicationLambda",
            runtime = lambda_.Runtime.PYTHON_3_9,
            handler = "submit_birth_application.handler",
            code = lambda_.Code.from_asset("lambda"),
            environment = {
                "APPLICATIONS_TABLE": birth_applications_table.table_name,
                "EVENT_BUS_NAME": "civil-registry-event-bus"
            }
        )
        birth_applications_table.grant_write_data(submit_birth_application_lambda)

        # Lambda function to handle marriage application submissions
        submit_marriage_application_lambda = lambda_.Function(
            self, "SubmitMarriageApplicationLambda",
            runtime = lambda_.Runtime.PYTHON_3_9,
            handler = "submit_marriage_application.handler",
            code = lambda_.Code.from_asset("lambda"),
            environment = {
                "APPLICATIONS_TABLE": marriage_applications_table.table_name,
                "EVENT_BUS_NAME": "civil-registry-event-bus"
            }
        )
        marriage_applications_table.grant_write_data(submit_marriage_application_lambda)

        # Lambda function to handle birth application updates
        update_birth_application_lambda = lambda_.Function(
            self, "UpdateBirthApplicationLambda",
            runtime = lambda_.Runtime.PYTHON_3_9,
            handler = "update_birth_application.handler",
            code = lambda_.Code.from_asset("lambda"),
            environment = {
                "APPLICATIONS_TABLE": birth_applications_table.table_name,
                "EVENT_BUS_NAME": "civil-registry-event-bus",
                "ADMIN_USER_POOL_ID": admin_user_pool.user_pool_id
            }
        )
        birth_applications_table.grant_read_write_data(update_birth_application_lambda)

        # Lambda function to handle marriage application updates
        update_marriage_application_lambda = lambda_.Function(
            self, "UpdateMarriageApplicationLambda",
            runtime = lambda_.Runtime.PYTHON_3_9,
            handler = "update_marriage_application.handler",
            code = lambda_.Code.from_asset("lambda"),
            environment = {
                "APPLICATIONS_TABLE": marriage_applications_table.table_name,
                "EVENT_BUS_NAME": "civil-registry-event-bus",
                "ADMIN_USER_POOL_ID": admin_user_pool.user_pool_id
            }
        )
        marriage_applications_table.grant_read_write_data(update_marriage_application_lambda)

        # Lambda function to retrieve birth application records for officers
        get_birth_applications_lambda = lambda_.Function(
            self, "GetBirthApplicationsLambda",
            runtime = lambda_.Runtime.PYTHON_3_9,
            handler = "get_applications.handler",
            code = lambda_.Code.from_asset("lambda"),
            environment = {
                "APPLICATIONS_TABLE": birth_applications_table.table_name,
                "ADMIN_USER_POOL_ID": admin_user_pool.user_pool_id
            }
        )
        birth_applications_table.grant_read_data(get_birth_applications_lambda)

        # Lambda function to retrieve marriage application records for officers
        get_marriage_applications_lambda = lambda_.Function(
            self, "GetMarriageApplicationsLambda",
            runtime = lambda_.Runtime.PYTHON_3_9,
            handler = "get_applications.handler",
            code = lambda_.Code.from_asset("lambda"),
            environment = {
                "APPLICATIONS_TABLE": marriage_applications_table.table_name,
                "ADMIN_USER_POOL_ID": admin_user_pool.user_pool_id
            }
        )
        marriage_applications_table.grant_read_data(get_marriage_applications_lambda)

        # API Gateway Configuration
        api = apigateway.RestApi(
            self, "CivilRegistryApi",
            rest_api_name = "Civil Registry Portal API",
            description = "API Gateway for Civil Status Micro-Service Portal",
            default_cors_preflight_options = apigateway.CorsOptions(
                allow_origins = apigateway.Cors.ALL_ORIGINS,
                allow_methods = apigateway.Cors.ALL_METHODS,
                # Cors.DEFAULT_HEADERS omits our custom session header, and the
                # browser preflight would reject the submit request without it.
                allow_headers = [*apigateway.Cors.DEFAULT_HEADERS, "X-Session-Token"]
            )
        )

        # Gateway-generated errors (e.g. an authorizer Deny) bypass the Lambda,
        # so they carry no CORS headers. Without these the browser reports an
        # opaque CORS failure instead of the actual 401/403 status.
        for response_id, response_type in (
            ("Default4xx", apigateway.ResponseType.DEFAULT_4_XX),
            ("Default5xx", apigateway.ResponseType.DEFAULT_5_XX),
        ):
            api.add_gateway_response(
                response_id,
                type = response_type,
                # Inner quotes are required: these are API Gateway mapping
                # expressions, not literal header values.
                response_headers = {"Access-Control-Allow-Origin": "'*'"}
            )

        # --- Supporting Document Storage ---

        # Deliberately separate from certificates_bucket: that bucket is Object
        # Lock / GOVERNANCE for issued, immutable records. These are unverified
        # citizen uploads that may need replacing, and want their own lifecycle.
        # No explicit bucket_name — S3 names are globally unique and nothing
        # refers to this bucket by literal name.
        documents_bucket = s3.Bucket(
            self, "ApplicationDocumentsBucket",
            block_public_access = s3.BlockPublicAccess.BLOCK_ALL,
            encryption = s3.BucketEncryption.S3_MANAGED,
            removal_policy = RemovalPolicy.DESTROY,
            cors = [
                s3.CorsRule(
                    # The browser POSTs the file directly here using a presigned policy.
                    allowed_methods = [s3.HttpMethods.POST],
                    allowed_origins = [CITIZEN_PORTAL_URL],
                    allowed_headers = ["*"],
                    max_age = 3000
                )
            ]
        )

        document_service_lambda = lambda_.Function(
            self, "DocumentServiceLambda",
            runtime = lambda_.Runtime.PYTHON_3_9,
            handler = "document_service.handler",
            code = lambda_.Code.from_asset("lambda"),
            environment = {
                "DOCUMENTS_BUCKET": documents_bucket.bucket_name,
                "ADMIN_USER_POOL_ID": admin_user_pool.user_pool_id
            }
        )
        # Presigned URLs are signed with this function's own credentials, so the
        # role needs the permission it is handing out.
        documents_bucket.grant_put(document_service_lambda)
        documents_bucket.grant_read(document_service_lambda)

        # OTP Service Resources
        otp_res = api.root.add_resource("otp")
        otp_send_res = otp_res.add_resource("send")
        otp_send_res.add_method("POST", apigateway.LambdaIntegration(otp_service_lambda))
        
        otp_verify_res = otp_res.add_resource("verify")
        otp_verify_res.add_method("POST", apigateway.LambdaIntegration(otp_service_lambda))

        # Contact Resource — unauthenticated by design; the Lambda validates and
        # rate-limits per sender address.
        contact_res = api.root.add_resource("contact")
        contact_res.add_method("POST", apigateway.LambdaIntegration(contact_service_lambda))

        # Cognito Authorizer — officers only. Every endpoint behind it is an
        # officer endpoint, and the handlers already re-check the issuer against
        # ADMIN_USER_POOL_ID. Including the citizen pool here only meant a citizen
        # token could pass the authorizer before being rejected by the Lambda.
        auth = apigateway.CognitoUserPoolsAuthorizer(
            self, "ApiAuthorizer",
            cognito_user_pools = [admin_user_pool]
        )

        # Documents Resource
        # Two authorizers on one resource: citizens (session token) mint upload
        # URLs, officers (Cognito) mint download URLs.
        documents_res = api.root.add_resource("documents")
        documents_res.add_method("POST", apigateway.LambdaIntegration(document_service_lambda), authorizer=session_authorizer)
        documents_res.add_method("GET", apigateway.LambdaIntegration(document_service_lambda), authorizer=auth)

        # Birth Applications Resource
        birth_res = api.root.add_resource("birth")
        birth_submit = birth_res.add_method("POST", apigateway.LambdaIntegration(submit_birth_application_lambda), authorizer=session_authorizer)
        birth_update = birth_res.add_method("PUT", apigateway.LambdaIntegration(update_birth_application_lambda), authorizer=auth)
        birth_get = birth_res.add_method("GET", apigateway.LambdaIntegration(get_birth_applications_lambda), authorizer=auth)

        # Marriage Applications Resource
        marriage_res = api.root.add_resource("marriage")
        marriage_submit = marriage_res.add_method("POST", apigateway.LambdaIntegration(submit_marriage_application_lambda), authorizer=session_authorizer)
        marriage_update = marriage_res.add_method("PUT", apigateway.LambdaIntegration(update_marriage_application_lambda), authorizer=auth)
        marriage_get = marriage_res.add_method("GET", apigateway.LambdaIntegration(get_marriage_applications_lambda), authorizer=auth)

        # --- Event-Driven Architecture Implementation ---
        
        # Certificate Storage Bucket
        certificates_bucket = s3.Bucket(
            self, "CertificatesBucket",
            bucket_name = "civil-status-certificates",
            block_public_access = s3.BlockPublicAccess.BLOCK_ALL,
            encryption = s3.BucketEncryption.S3_MANAGED,
            object_lock_enabled = True,
            removal_policy = RemovalPolicy.DESTROY
        )

        # Configure Default Retention (Governance Mode)
        # We use CfnBucket for the specific Object Lock Configuration for default retention
        cfn_bucket = certificates_bucket.node.default_child
        cfn_bucket.add_property_override(
            "ObjectLockConfiguration", 
            {
                "ObjectLockEnabled": "Enabled",
                "Rule": {
                    "DefaultRetention": {
                        "Mode": "GOVERNANCE",
                        "Days": 1
                    }
                }
            }
        )

        # 1. Custom Event Bus
        event_bus = events.EventBus(
            self, "CivilRegistryEventBus",
            event_bus_name = "civil-registry-event-bus"
        )

        # 2. Dead Letter Queue for failure handling
        event_dlq = sqs.Queue(
            self, "EventBusDLQ",
            queue_name = "civil-registry-event-dlq"
        )

        # 3. Notification Service Lambda
        # Emails the citizen on submission and on an officer's decision. The
        # recipient is the event's citizenId, which is the citizen's email.
        notification_lambda = lambda_.Function(
            self, "NotificationServiceLambda",
            runtime = lambda_.Runtime.PYTHON_3_9,
            handler = "notification_service.handler",
            code = lambda_.Code.from_asset("lambda"),
            timeout = Duration.seconds(30),
            environment = smtp_environment
        )
        smtp_secret.grant_read(notification_lambda)

        # 4. EventBridge Rule to trigger notifications
        # Every event type that results in an email must be listed here, or it is
        # published to the bus and silently matched by nothing.
        notification_rule = events.Rule(
            self, "ApplicationStatusRule",
            event_bus = event_bus,
            event_pattern = events.EventPattern(
                detail_type = [
                    "ApplicationSubmitted",
                    "ApplicationStatusUpdated",
                    "ContactMessageReceived",
                ]
            )
        )

        # Add NotificationLambda as target with DLQ for failures
        notification_rule.add_target(
            targets.LambdaFunction(
                notification_lambda,
                dead_letter_queue = event_dlq
            )
        )

        # Grant existing Lambdas permission to put events on the bus
        event_bus.grant_put_events_to(submit_birth_application_lambda)
        event_bus.grant_put_events_to(submit_marriage_application_lambda)
        event_bus.grant_put_events_to(update_birth_application_lambda)
        event_bus.grant_put_events_to(update_marriage_application_lambda)
        event_bus.grant_put_events_to(contact_service_lambda)

        # --- Outputs ---
        # These are exactly the four values admin-portal/.env.local needs. They
        # were previously read out of the console by hand, which is how the
        # client id and hosted-UI domain drifted onto two different user pools.

        CfnOutput(
            self, "AdminUserPoolId",
            value = admin_user_pool.user_pool_id,
            description = "NEXT_PUBLIC_USER_POOL_ID"
        )
        CfnOutput(
            self, "AdminUserPoolClientId",
            value = admin_client.user_pool_client_id,
            description = "NEXT_PUBLIC_USER_POOL_CLIENT_ID"
        )
        CfnOutput(
            self, "AdminCognitoDomain",
            # Amplify wants the bare host, with no scheme.
            value = f"{admin_domain.domain_name}.auth.{self.region}.amazoncognito.com",
            description = "NEXT_PUBLIC_COGNITO_DOMAIN"
        )
        CfnOutput(
            self, "ApiUrl",
            value = api.url,
            description = "NEXT_PUBLIC_API_URL (strip the trailing slash)"
        )

