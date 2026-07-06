import {
  DescribeInstancesCommand,
  EC2Client,
  StartInstancesCommand,
  StopInstancesCommand,
} from "@aws-sdk/client-ec2";
import { timingSafeEqual } from "node:crypto";

export const INSTANCE_ID_KEY = "INSTANCE_ID";
export const AUTH_TOKEN_KEY = "AUTH_TOKEN";

const ec2 = new EC2Client({ region: "ap-southeast-1" });

const respond = (statusCode, message) => {
  const response = {
    statusCode,
    headers: { "Content-Type": "text/plain" },
    body: `${message}\n`,
  };
  console.log("Response:", response);
  return response;
};

const tokenMatches = (provided, expected) => {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

const getState = async (instanceId) => {
  const { Reservations } = await ec2.send(
    new DescribeInstancesCommand({ InstanceIds: [instanceId] }),
  );
  return Reservations[0].Instances[0].State.Name;
};

export const handler = async (event) => {
  const instanceId = process.env[INSTANCE_ID_KEY];
  const token = process.env[AUTH_TOKEN_KEY]?.trim();

  const missing = [
    !instanceId && INSTANCE_ID_KEY,
    !token && AUTH_TOKEN_KEY,
  ].filter(Boolean);
  if (missing.length > 0) {
    console.error(`${missing.join(", ")} environment variable(s) missing`);
    return respond(500, "misconfigured");
  }

  const params = event?.queryStringParameters ?? {};

  if (!params.key || !tokenMatches(params.key, token)) {
    console.error(
      params.key
        ? `auth failed: key mismatch (got ${params.key.length} chars, expected ${token.length})`
        : "auth failed: no key query parameter",
    );
    return respond(403, "forbidden");
  }

  const action = (params.action ?? "status").toLowerCase();
  if (!["status", "on", "off"].includes(action)) {
    return respond(400, "action must be on | off | status");
  }

  try {
    const state = await getState(instanceId);

    switch (action) {
      case "status":
        return respond(200, state);

      case "on":
        switch (state) {
          case "running":
            return respond(200, "running");
          case "stopped":
            await ec2.send(
              new StartInstancesCommand({ InstanceIds: [instanceId] }),
            );
            return respond(200, "starting");
          case "pending":
          case "stopping":
            return respond(409, `busy (${state}), retry shortly`);
          default:
            return respond(409, `unexpected state: ${state}`);
        }

      case "off":
        switch (state) {
          case "stopped":
            return respond(200, "stopped");
          case "running":
            await ec2.send(
              new StopInstancesCommand({ InstanceIds: [instanceId] }),
            );
            return respond(200, "stopping");
          case "pending":
          case "stopping":
            return respond(409, `busy (${state}), retry shortly`);
          default:
            return respond(409, `unexpected state: ${state}`);
        }
    }
  } catch (error) {
    console.error("Error managing instance:", error.message);
    return respond(500, `error: ${error.message}`);
  }
};
