import {
  APIGatewayAuthorizerResult,
  APIGatewayAuthorizerResultContext,
  APIGatewayTokenAuthorizerEvent,
  StatementEffect,
} from "aws-lambda";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

const USERNAME = process.env.USERNAME || "";
const PASSWORD = process.env.PASSWORD || "";

export async function handler(
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> {
  try {
    console.log("[basicAuthorizer] event:", JSON.stringify(event));
    const authHeader = event?.authorizationToken;
    const resourceArn = event?.methodArn;

    if (!authHeader) {
      console.error("Unauthorized: Authorization header is missing");
      const error = new Error("Authorization header is missing");
      error.name = "UnauthorizedError";
      throw error;
    }

    const [type, token] = authHeader.split(" ");
    if (type !== "Basic" || !token) {
      console.error(`Invalid token: type ${type}, token ${token}`);
      return generatePolicy("user", "Deny", resourceArn, {
        error: "Invalid token",
      });
    }

    const credentials = atob(token);
    const [username, password] = credentials.split(":");

    if (username === USERNAME && password === PASSWORD) {
      console.log("Authorized");
      return generatePolicy("user", "Allow", resourceArn, { username });
    } else {
      console.log("Invalid credentials");
      return generatePolicy("user", "Deny", resourceArn, {
        error: "Invalid credentials",
      });
    }
  } catch (e) {
    console.log("[basicAuthorizer] error:", JSON.stringify(e));
    throw e;
  }
}

function generatePolicy(
  principalId: string,
  effect: StatementEffect,
  resource: string,
  context?: APIGatewayAuthorizerResultContext
): APIGatewayAuthorizerResult {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context,
  };
}
