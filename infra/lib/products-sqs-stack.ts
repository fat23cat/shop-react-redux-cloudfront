import * as cdk from "aws-cdk-lib";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

export class ProductsSQSStack extends cdk.Stack {
  readonly sqs: cdk.aws_sqs.Queue;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.sqs = new sqs.Queue(this, "CatalogItemsQueue", {
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      visibilityTimeout: cdk.Duration.seconds(60),
      deliveryDelay: cdk.Duration.seconds(0),
      retentionPeriod: cdk.Duration.days(1),
    });
  }
}
