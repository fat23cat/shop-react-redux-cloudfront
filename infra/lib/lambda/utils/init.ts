import { data } from "./data";
import {
  DynamoDBClient,
  BatchWriteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { randomUUID } from "crypto";
import { marshall } from "@aws-sdk/util-dynamodb";

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const productsTableName = process.env.PRODUCTS_TABLE_NAME || "";
const stockTableName = process.env.STOCK_TABLE_NAME || "";

export async function handler(): Promise<void> {
  try {
    const items = data.map((item) => ({
      ...item,
      id: randomUUID(),
    }));

    console.log("Tables data:", items);

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
        [stockTableName]: items.map(({ id }) => ({
          PutRequest: {
            Item: marshall({
              productId: id,
              count: Math.floor(Math.random() * 101),
            }),
          },
        })),
      },
    });

    await Promise.all([
      dynamoDB.send(batchWriteProducts),
      dynamoDB.send(batchWriteStock),
    ]);

    console.log("Tables data inserted successfully");
  } catch (error) {
    console.error("Error inserting tables data: ", error);
  }
}
