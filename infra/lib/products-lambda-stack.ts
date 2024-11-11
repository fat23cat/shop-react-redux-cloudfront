import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from "aws-cdk-lib";
import * as path from "path";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as eventSources from "aws-cdk-lib/aws-lambda-event-sources";
import { Construct } from "constructs";
import { ProductsApiStack } from "./products-api-stack";
import { ProductsDBStack } from "./products-db-stack";
import { ProductsSQSStack } from "./products-sqs-stack";
import { ProductsSNSStack } from "./products-sns-stack";

interface ProductsLambdaStackProps extends cdk.StackProps {
  productsApiStack: ProductsApiStack;
  productsDBStack: ProductsDBStack;
  productsSQSStack: ProductsSQSStack;
  productsSNSStack: ProductsSNSStack;
}

export class ProductsLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ProductsLambdaStackProps) {
    super(scope, id, props);

    const productsResource =
      props.productsApiStack.api.root.addResource("products");

    const getProductsListLambda = new lambda.Function(this, "getProductsList", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 128,
      timeout: cdk.Duration.seconds(30),
      handler: "getProductsList.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "./lambda/products")),
      environment: {
        PRODUCTS_TABLE_NAME: props.productsDBStack.productsTable.tableName,
        STOCK_TABLE_NAME: props.productsDBStack.stockTable.tableName,
      },
    });
    const createProductLambda = new lambda.Function(
      this,
      "createProductLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 128,
        timeout: cdk.Duration.seconds(30),
        handler: "createProduct.handler",
        code: lambda.Code.fromAsset(path.join(__dirname, "./lambda/products")),
        environment: {
          PRODUCTS_TABLE_NAME: props.productsDBStack.productsTable.tableName,
          STOCK_TABLE_NAME: props.productsDBStack.stockTable.tableName,
        },
      }
    );
    props.productsDBStack.productsTable.grantReadData(getProductsListLambda);
    props.productsDBStack.stockTable.grantReadData(getProductsListLambda);
    props.productsDBStack.productsTable.grantWriteData(createProductLambda);
    props.productsDBStack.stockTable.grantWriteData(createProductLambda);
    const getProductsListLambdaIntegration = new apigateway.LambdaIntegration(
      getProductsListLambda
    );
    const createProductLambdaIntegration = new apigateway.LambdaIntegration(
      createProductLambda
    );
    productsResource.addMethod("GET", getProductsListLambdaIntegration);
    productsResource.addMethod("POST", createProductLambdaIntegration);

    const oneProductResource = productsResource.addResource("{productId}");
    const getProductByIdLambda = new lambda.Function(this, "getProductById", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 128,
      timeout: cdk.Duration.seconds(30),
      handler: "getProductById.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "./lambda/products")),
      environment: {
        PRODUCTS_TABLE_NAME: props.productsDBStack.productsTable.tableName,
        STOCK_TABLE_NAME: props.productsDBStack.stockTable.tableName,
      },
    });
    props.productsDBStack.productsTable.grantReadData(getProductByIdLambda);
    props.productsDBStack.stockTable.grantReadData(getProductByIdLambda);
    const getProductByIdLambdaIntegration = new apigateway.LambdaIntegration(
      getProductByIdLambda
    );
    oneProductResource.addMethod("GET", getProductByIdLambdaIntegration);

    const catalogBatchProcessLambda = new lambda.Function(
      this,
      "catalogBatchProcess",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 128,
        timeout: cdk.Duration.seconds(30),
        handler: "catalogBatchProcess.handler",
        code: lambda.Code.fromAsset(path.join(__dirname, "./lambda/products")),
        environment: {
          PRODUCTS_TABLE_NAME: props.productsDBStack.productsTable.tableName,
          STOCK_TABLE_NAME: props.productsDBStack.stockTable.tableName,
          SNS_TOPIC_ARN: props.productsSNSStack.sns.topicArn,
        },
      }
    );
    props.productsSQSStack.sqs.grantConsumeMessages(catalogBatchProcessLambda);
    catalogBatchProcessLambda.addEventSource(
      new eventSources.SqsEventSource(props.productsSQSStack.sqs, {
        batchSize: 5,
        maxBatchingWindow: cdk.Duration.seconds(10),
      })
    );
    props.productsSNSStack.sns.grantPublish(catalogBatchProcessLambda);
    props.productsDBStack.productsTable.grantWriteData(
      catalogBatchProcessLambda
    );
    props.productsDBStack.stockTable.grantWriteData(catalogBatchProcessLambda);
  }
}
