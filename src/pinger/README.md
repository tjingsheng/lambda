# Pinger

## Overview

Pinger is a lightweight solution for keeping certain free-tier services active by ensuring they receive regular activity. Some services automatically pause due to inactivity, causing issues during use.

Pinger is automatically called using [**AWS EventBridge Scheduler**](https://aws.amazon.com/eventbridge/scheduler/) at specified intervals to ping a given URL, preventing services from entering an idle or paused state.

## How It Works

1. **AWS Lambda Function**: A simple function using `fetch` to send a request to a specified URL.
2. **AWS EventBridge**: Schedules the Lambda function to run at regular intervals.
3. **Environment Variables**: Uses an environment variable (`PING_URL`) to determine which service to ping.

## Environment Variables

| Variable   | Required | Description      |
| ---------- | -------- | ---------------- |
| `PING_URL` | Yes      | The URL to ping. |

## Deployment

1. Build from the repo root with `pnpm build` — outputs `dist/pinger/index.mjs`.
2. Deploy `dist/pinger/` as an AWS Lambda function (handler: `index.handler`) with the environment variables above.
3. Set up an AWS EventBridge Schedule to invoke the function at your desired intervals.
