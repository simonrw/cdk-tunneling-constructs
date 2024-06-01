import { CfnResource, CustomResource, CustomResourceProvider, CustomResourceProviderRuntime, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as neptune from '@aws-cdk/aws-neptune-alpha';
import { IpAddresses, Vpc } from "aws-cdk-lib/aws-ec2";
import { NetworkLoadBalancer } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { IpTarget } from "aws-cdk-lib/aws-elasticloadbalancingv2-targets";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";


export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, "VPC", {
      ipAddresses: IpAddresses.cidr("10.0.15.0/24"),
    });

    const cluster = new neptune.DatabaseCluster(this, "Cluster", {
      vpc,
      instanceType: neptune.InstanceType.R5_LARGE,
    });
    cluster.connections.allowDefaultPortFromAnyIpv4("open to the world");
    for (const child of cluster.node.children) {
      const resource = child as CfnResource;
      resource.applyRemovalPolicy(RemovalPolicy.DESTROY);
    }

    // add networking
    const lb = new NetworkLoadBalancer(this, "LoadBalancer", {
      vpc,
    });
    const listener = lb.addListener("Listener", {
      port: 8182,
    });
    listener.addTargets("Target", {
      port: 8182,
      targets: [new IpTarget("127.0.0.1", 8182)],
    });

    // lambda function to keep the listener up to date
    const updateFn = new NodejsFunction(this, "UpdateFunction", {
      vpc,
      runtime: Runtime.NODEJS_18_X,
    });
  }
};
