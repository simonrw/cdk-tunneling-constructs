import { CfnResource, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as neptune from '@aws-cdk/aws-neptune-alpha';
import { IpAddresses, Vpc } from "aws-cdk-lib/aws-ec2";
import { NetworkLoadBalancer, Protocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { IpTarget } from "aws-cdk-lib/aws-elasticloadbalancingv2-targets";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { Effect, Policy, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";


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
    const target = listener.addTargets("Target", {
      port: 8182,
      targets: [new IpTarget("10.0.15.12", 8182)],
      protocol: Protocol.TCP,
    });


    const updateLoadBalancerRole = new Role(this, "UpdateLBRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
    });
    updateLoadBalancerRole.addToPolicy(new PolicyStatement({
      // TODO: narrow down
      actions: ["elasticloadbalancing:*"],
      resources: [lb.loadBalancerArn],
      effect: Effect.ALLOW,
    }));
    updateLoadBalancerRole.addToPolicy(new PolicyStatement({
      // TODO: narrow down
      actions: ["ec2:*"],
      resources: ["*"],
      effect: Effect.ALLOW,
    }));

    // lambda function to keep the listener up to date
    const updateFunction = new NodejsFunction(this, "UpdateFunction", {
      vpc,
      runtime: Runtime.NODEJS_18_X,
      environment: {
        CLUSTER_DOMAIN: cluster.clusterEndpoint.hostname,
        LOAD_BALANCER_ARN: lb.loadBalancerArn,
      },
      role: updateLoadBalancerRole,
    });
  }
};
