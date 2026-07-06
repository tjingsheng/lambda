export const PING_URL_KEY = "PING_URL";

export const handler = async (_event) => {
  const url = process.env[PING_URL_KEY];
  const timestamp = new Date().toLocaleString("en-SG", {
    timeZone: "Asia/Singapore",
  });

  if (!url) {
    console.error(`${PING_URL_KEY} environment variable is missing`);
    const errorResponse = {
      timestamp,
      statusCode: 500,
      body: JSON.stringify({
        message: `Missing ${PING_URL_KEY} environment variable`,
      }),
    };
    console.log("Response:", errorResponse);
    return errorResponse;
  }

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    const headers = Object.fromEntries(response.headers);
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    const successResponse = {
      timestamp,
      statusCode: response.status,
      headers,
      body: JSON.stringify({
        message: `Pinged ${url}`,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        data,
        headers,
      }),
    };

    console.log("Response:", successResponse);
    return successResponse;
  } catch (error) {
    console.error("Error calling API:", error.message);

    const errorResponse = {
      timestamp,
      statusCode: 500,
      body: JSON.stringify({
        message: `Error pinging ${url}`,
        error: error.message,
        name: error.name,
      }),
    };

    console.log("Response:", errorResponse);
    return errorResponse;
  }
};
