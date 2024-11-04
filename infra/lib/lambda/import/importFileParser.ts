import { S3Event } from "aws-lambda";
import { S3, SQS } from "aws-sdk";
import * as csv from "csv-parser";

const s3 = new S3({ region: process.env.AWS_REGION });
const sqs = new SQS({ region: process.env.AWS_REGION });
const queueUrl = process.env.QUEUE_URL || "";

export async function handler(event: S3Event): Promise<void> {
  try {
    console.log("[importFileParser] event:", JSON.stringify(event));

    for (const record of event.Records) {
      const bucket = record.s3.bucket.name;
      const key = record.s3.object.key;

      if (!key.endsWith(".csv")) {
        console.error("Wrong file extension, only .csv is supported");
        continue;
      }

      console.log(`Processing file: ${key} from bucket: ${bucket}`);

      const s3Stream = s3
        .getObject({
          Bucket: bucket,
          Key: key,
        })
        .createReadStream();

      const messages: Record<string, string>[] = [];

      await new Promise((resolve, reject) => {
        s3Stream
          .pipe(csv())
          .on("data", (data: Record<string, string>) => {
            messages.push(data);
          })
          .on("error", (e) => reject(e))
          .on("end", resolve);
      });

      await sendMessagesInBatch(messages);

      const newKey = key.replace("uploaded/", "parsed/");
      await s3
        .copyObject({
          Bucket: bucket,
          CopySource: `${bucket}/${key}`,
          Key: newKey,
        })
        .promise();

      await s3
        .deleteObject({
          Bucket: bucket,
          Key: key,
        })
        .promise();

      console.log(`Successfully moved file from ${key} to ${newKey}`);
    }
  } catch (e) {
    console.error("[importFileParser] error:", e);
  }
}

async function sendMessagesInBatch(messages: Record<string, string>[]) {
  const batchSize = 10;
  const batches = [];

  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    const entries = batch.map((message, index) => ({
      Id: `message-${Date.now()}-${i + index}`,
      MessageBody: JSON.stringify(message),
    }));

    console.log("entries", entries);

    batches.push(
      sqs
        .sendMessageBatch({
          QueueUrl: queueUrl,
          Entries: entries,
        })
        .promise()
    );
  }

  return Promise.all(batches);
}
