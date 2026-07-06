# Lambda Tools

## Overview

A collection of small tools built to be deployed to [**AWS Lambda**](https://aws.amazon.com/lambda/). Each tool lives in its own directory under `src/` together with its own `README.md` covering everything tool-specific — what it does, which environment variables it needs, and how to deploy it. The build bundles every tool into its own directory under `dist/`, ready to be deployed independently.

```
src/<tool>/
  index.js    ->  dist/<tool>/index.mjs   (Lambda handler)
  README.md                               (tool-specific docs: what it is, env vars, deployment)
```

## Adding a New Tool

1. Create `src/<tool>/index.js` exporting a `handler` function.
2. Create `src/<tool>/README.md` describing the tool and its environment variables.
3. Run `pnpm build` — every tool is bundled to its own `dist/<tool>/index.mjs`.
4. Deploy `dist/<tool>/` as its own Lambda function.

## Deployment Steps

Before proceeding, ensure you have the following prerequisites:

- **AWS**: Able to deploy to [AWS Lambda](https://aws.amazon.com/lambda/)
- **Node.js**: Download and install from [nodejs](https://nodejs.org/)
- **pnpm**: Download and install from [pnpm](https://pnpm.io/installation)

### 1. Install Dependencies

Run the following command to install dependencies:

```sh
pnpm install
```

### 2. Build the Project

Compile the project using:

```sh
pnpm build
```

Each tool is bundled to its own directory, e.g. `dist/<tool>/index.mjs`.

### 3. Deploy to AWS Lambda

Set up one AWS Lambda function per tool using its built directory (handler: `index.handler`), and configure the environment variables listed in the tool's `README.md`.

### 4. Configure a Trigger

Wire up whatever should invoke the function - for scheduled tools, an [AWS EventBridge Schedule](https://aws.amazon.com/eventbridge/scheduler/) at your desired intervals. See the tool's `README.md` for specifics.
