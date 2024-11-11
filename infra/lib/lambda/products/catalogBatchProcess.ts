import {
  BatchWriteItemCommand,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import { SQSEvent } from "aws-lambda";
import { SNS } from "aws-sdk";
import { randomUUID } from "crypto";
import { marshall } from "@aws-sdk/util-dynamodb";
import { NewProductSchema } from "./validationSchema";

const sns = new SNS({ region: process.env.AWS_REGION });
const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const productsTableName = process.env.PRODUCTS_TABLE_NAME || "";
const stockTableName = process.env.STOCK_TABLE_NAME || "";
const snsTopicArn = process.env.SNS_TOPIC_ARN || "";

export async function handler(event: SQSEvent): Promise<void> {
  try {
    console.log("[catalogBatchProcess] event:", JSON.stringify(event));

    const products = [];

    for (const record of event.Records) {
      let body = record.body ? JSON.parse(record.body) : {};
      body = {
        ...body,
        price: +body.price,
        count: +body.count,
      };
      const validationResult = NewProductSchema.safeParse(body);
      if (validationResult.success) {
        products.push(body);
      } else {
        console.error(
          `Invalid product entity, record: ${JSON.stringify(
            record.body
          )}, errors: ${JSON.stringify(validationResult.error)}`
        );
      }
    }

    console.log("Products: ", products);

    if (!products.length) {
      console.log("No products to save");
      return;
    }

    const items = products.map((product) => ({
      ...product,
      id: randomUUID(),
    }));

    const batchWriteProducts = new BatchWriteItemCommand({
      RequestItems: {
        [productsTableName]: items.map(({ id, description, price, title }) => ({
          PutRequest: {
            Item: marshall({ id, description, price, title }),
          },
        })),
      },
    });

    const batchWriteStock = new BatchWriteItemCommand({
      RequestItems: {
        [stockTableName]: items.map(({ id, count }) => ({
          PutRequest: {
            Item: marshall({
              productId: id,
              count,
            }),
          },
        })),
      },
    });

    await Promise.all([
      dynamoDB.send(batchWriteProducts),
      dynamoDB.send(batchWriteStock),
    ]);

    const result = await sns
      .publish({
        Message: JSON.stringify({
          message: "Products created successfully",
          products,
        }),
        TopicArn: snsTopicArn,
        MessageAttributes: {
          hasExpensiveProducts: {
            DataType: "String",
            StringValue: String(products.some((p) => p.price >= 50)),
          },
          hasCheapProducts: {
            DataType: "String",
            StringValue: String(products.some((p) => p.price < 50)),
          },
        },
      })
      .promise();
    console.log("SNS message sent:", result);
  } catch (e) {
    console.error("[catalogBatchProcess] error:", e);
  }
}
