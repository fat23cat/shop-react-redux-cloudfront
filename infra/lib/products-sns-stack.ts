import * as cdk from "aws-cdk-lib";
import * as sns from "aws-cdk-lib/aws-sns";
import { Construct } from "constructs";
import * as snsSubscriptions from "aws-cdk-lib/aws-sns-subscriptions";

export class ProductsSNSStack extends cdk.Stack {
  readonly sns: cdk.aws_sns.Topic;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.sns = new sns.Topic(this, "CreateProductTopic", {
      topicName: "createProductTopic",
    });

    this.sns.addSubscription(
      new snsSubscriptions.EmailSubscription("pavel_sidorenko@epam.com", {
        filterPolicy: {
          hasExpensiveProducts: sns.SubscriptionFilter.stringFilter({
            allowlist: ["true"],
          }),
        },
      })
    );

    this.sns.addSubscription(
      new snsSubscriptions.EmailSubscription("fat.cat.1703@gmail.com", {
        filterPolicy: {
          hasCheapProducts: sns.SubscriptionFilter.stringFilter({
            allowlist: ["true"],
          }),
        },
      })
    );
  }
}
