import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { data } from "./data";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

export async function handler(
  _event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    return {
      body: JSON.stringify(data),
      statusCode: 200,
      headers,
    };
  } catch (e) {
    console.error("[getProductsList]", e);
    return {
      body: JSON.stringify({
        message: "Internal Server Error",
      }),
      statusCode: 500,
      headers,
    };
  }
}
