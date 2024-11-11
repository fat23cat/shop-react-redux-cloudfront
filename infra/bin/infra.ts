#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { DeployWebAppStack } from "../lib/deploy-web-app-stack";
import { ProductsLambdaStack } from "../lib/products-lambda-stack";
import { ProductsApiStack } from "../lib/products-api-stack";
import { ProductsDBStack } from "../lib/products-db-stack";
import { ImportServiceStack } from "../lib/import-service-stack";
import { ProductsSQSStack } from "../lib/products-sqs-stack";
import { ProductsSNSStack } from "../lib/products-sns-stack";

const app = new cdk.App();
new DeployWebAppStack(app, "DeployWebAppStack", {});
const productsSQSStack = new ProductsSQSStack(app, "ProductsSQSStack");
const productsSNSStack = new ProductsSNSStack(app, "ProductsSNSStack");
const productsApiStack = new ProductsApiStack(app, "ProductsApiStack");
const productsDBStack = new ProductsDBStack(app, "ProductsDBStack");
new ProductsLambdaStack(app, "ProductsLambdaStack", {
  productsApiStack,
  productsDBStack,
  productsSQSStack,
  productsSNSStack,
});
new ImportServiceStack(app, "ImportServiceStack", { productsSQSStack });
