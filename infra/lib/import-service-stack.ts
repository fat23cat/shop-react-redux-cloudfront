import {
  aws_s3,
  RemovalPolicy,
  aws_s3_deployment,
  CfnOutput,
  Stack,
  StackProps,
  Duration,
  aws_s3_notifications,
} from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import path = require("path");
import { ProductsSQSStack } from "./products-sqs-stack";

interface ImportServiceStackProps extends StackProps {
  productsSQSStack: ProductsSQSStack;
}

export class ImportServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: ImportServiceStackProps) {
    super(scope, id);

    const importBucket = new aws_s3.Bucket(this, "ImportServiceBucket", {
      autoDeleteObjects: true,
      blockPublicAccess: aws_s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      cors: [
        {
          allowedOrigins: ["*"],
          allowedMethods: [aws_s3.HttpMethods.PUT],
          allowedHeaders: ["*"],
        },
      ],
    });

    new aws_s3_deployment.BucketDeployment(this, "UploadFolderDeployment", {
      destinationBucket: importBucket,
      destinationKeyPrefix: "uploaded/",
      sources: [
        aws_s3_deployment.Source.data(
          ".placeholder",
          "This is a placeholder file"
        ),
      ],
    });

    new CfnOutput(this, "ImportServiceBucketName", {
      value: importBucket.bucketName,
      description: "The name of the S3 bucket",
      exportName: "ImportServiceBucketName",
    });

    const api = new apigateway.RestApi(this, "import-api", {
      restApiName: "My Import API Gateway",
      description: "This API serves the Import Lambda functions.",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const importResource = api.root.addResource("import");
    const importProductsFileLambda = new lambda.Function(
      this,
      "importProductsFile",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 128,
        timeout: Duration.seconds(30),
        handler: "importProductsFile.handler",
        code: lambda.Code.fromAsset(path.join(__dirname, "./lambda/import")),
        environment: {
          BUCKET_NAME: importBucket.bucketName,
        },
      }
    );
    importBucket.grantPut(importProductsFileLambda);
    const importProductsFileLambdaIntegration =
      new apigateway.LambdaIntegration(importProductsFileLambda);
    importResource.addMethod("GET", importProductsFileLambdaIntegration);

    const importFileParserLambda = new lambda.Function(
      this,
      "importFileParser",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 128,
        timeout: Duration.seconds(30),
        handler: "importFileParser.handler",
        code: lambda.Code.fromAsset(path.join(__dirname, "./lambda/import")),
        environment: {
          QUEUE_URL: props.productsSQSStack.sqs.queueUrl,
        },
      }
    );
    props.productsSQSStack.sqs.grantSendMessages(importFileParserLambda);
    importBucket.grantReadWrite(importFileParserLambda);
    importBucket.addEventNotification(
      aws_s3.EventType.OBJECT_CREATED,
      new aws_s3_notifications.LambdaDestination(importFileParserLambda),
      { prefix: "uploaded/" }
    );
  }
}
