import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { data } from "./data";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const { productId } = event.pathParameters || {};
    const product = data.find((d) => d.id === productId);
    return product
      ? {
          body: JSON.stringify(product),
          statusCode: 200,
          headers,
        }
      : {
          body: JSON.stringify({
            message: `Product id "${productId}" was not found`,
          }),
          statusCode: 404,
          headers,
        };
  } catch (e) {
    console.error("[getProductById]", e);
    return {
      body: JSON.stringify({
        message: "Internal Server Error",
      }),
      statusCode: 500,
      headers,
    };
  }
}
