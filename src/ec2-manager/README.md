# EC2 Manager

## Overview

EC2 Manager is a remote on/off/status switch for a single EC2 instance, exposed via a [Lambda Function URL](https://docs.aws.amazon.com/lambda/latest/dg/urls-invocation.html) and guarded by a secret token. Bookmark the endpoints and toggle the instance from anywhere without opening the AWS console.

It is idempotent — `on` while running returns `running`, `off` while stopped returns `stopped`, no accidental toggling. Transitional states (`pending`/`stopping`) return `409` so you don't fire a conflicting call mid-transition.

## Endpoints

```
Status:  https://<function-url>/?key=TOKEN                (default action)
         https://<function-url>/?key=TOKEN&action=status
On:      https://<function-url>/?key=TOKEN&action=on
Off:     https://<function-url>/?key=TOKEN&action=off
```

The default action is `status`, so hitting the bare URL (with `key`) is a safe read.

## Environment Variables

| Variable      | Required | Description                                                             |
| ------------- | -------- | ----------------------------------------------------------------------- |
| `INSTANCE_ID` | Yes      | The EC2 instance to control, e.g. `i-xxxxxxxxxxxxxxxxx`.                |
| `AUTH_TOKEN`  | Yes      | Long random secret; requests must pass it as the `key` query parameter. |

The region is hardcoded to `ap-southeast-1` (`REGION` in `index.js`).

## IAM Policy

Attach a policy to the function's execution role allowing it to describe, start, and stop the instance:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ec2:StartInstances", "ec2:StopInstances"],
      "Resource": "arn:aws:ec2:<region>:<account-id>:instance/<instance-id>"
    },
    {
      "Effect": "Allow",
      "Action": "ec2:DescribeInstances",
      "Resource": "*"
    }
  ]
}
```

_`ec2:DescribeInstances` does not support resource-level permissions, hence the `*`._

Also attach the AWS managed policy `AWSLambdaBasicExecutionRole` to the role, otherwise the function's CloudWatch logs are silently dropped.

## Deployment

1. Build from the repo root with `pnpm build` — outputs `dist/ec2-manager/index.mjs`. The AWS SDK is not bundled; the Lambda Node.js runtime provides it.
2. Deploy `dist/ec2-manager/` as an AWS Lambda function (handler: `index.handler`) with the environment variables above and the IAM policy attached.
3. Enable a Function URL with auth type `NONE` — the token guards it.

## Security Note

With Function URL auth `NONE`, the token is the only gate. Keep it long and random (e.g. `openssl rand -hex 32`), treat the bookmarked URL like a credential, and rotate the token by updating the `AUTH_TOKEN` environment variable. For a stronger setup, switch the Function URL to `AWS_IAM` auth and sign requests instead.
