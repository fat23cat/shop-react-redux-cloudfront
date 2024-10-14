import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from "aws-cdk-lib";
import * as path from "path";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";

export class ProductsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const api = new apigateway.RestApi(this, "products-api", {
      restApiName: "My Products API Gateway",
      description: "This API serves the Products Lambda functions.",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const productsResource = api.root.addResource("products");
    const getProductsListLambda = new lambda.Function(this, "getProductsList", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 128,
      timeout: cdk.Duration.seconds(5),
      handler: "getProductsList.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "./lambda/products")),
    });
    const getProductsListLambdaIntegration = new apigateway.LambdaIntegration(
      getProductsListLambda
    );
    productsResource.addMethod("GET", getProductsListLambdaIntegration);

    const oneProductResource = productsResource.addResource("{productId}");
    const getProductByIdLambda = new lambda.Function(this, "getProductById", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 128,
      timeout: cdk.Duration.seconds(5),
      handler: "getProductById.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "./lambda/products")),
    });
    const getProductByIdLambdaIntegration = new apigateway.LambdaIntegration(
      getProductByIdLambda
    );
    oneProductResource.addMethod("GET", getProductByIdLambdaIntegration);
  }
}
