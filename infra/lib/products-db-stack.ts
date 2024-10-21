import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from "aws-cdk-lib";
import * as path from "path";
import { Construct } from "constructs";
import { PRODUCTS_TABLE_NAME, STOCK_TABLE_NAME } from "./conts";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as customResources from "aws-cdk-lib/custom-resources";

export class ProductsDBStack extends cdk.Stack {
  readonly productsTable: cdk.aws_dynamodb.Table;
  readonly stockTable: cdk.aws_dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.productsTable = new dynamodb.Table(this, PRODUCTS_TABLE_NAME, {
      tableName: PRODUCTS_TABLE_NAME,
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
    });

    this.stockTable = new dynamodb.Table(this, STOCK_TABLE_NAME, {
      tableName: STOCK_TABLE_NAME,
      partitionKey: {
        name: "productId",
        type: dynamodb.AttributeType.STRING,
      },
    });

    const initDataLambda = new lambda.Function(this, "init", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 128,
      timeout: cdk.Duration.seconds(5),
      handler: "init.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "./lambda/utils")),
      environment: {
        PRODUCTS_TABLE_NAME,
        STOCK_TABLE_NAME,
      },
    });

    this.productsTable.grantReadWriteData(initDataLambda);
    this.stockTable.grantReadWriteData(initDataLambda);

    const provider = new customResources.Provider(this, "MyProvider", {
      onEventHandler: initDataLambda,
    });

    new cdk.CustomResource(this, "MyCustomResource", {
      serviceToken: provider.serviceToken,
    });
  }
}
