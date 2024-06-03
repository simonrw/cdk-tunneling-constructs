import { CfnOutput, CfnResource, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as neptune from '@aws-cdk/aws-neptune-alpha';
import { IpAddresses, Vpc } from "aws-cdk-lib/aws-ec2";
import { NetworkLoadBalancer, Protocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { IpTarget } from "aws-cdk-lib/aws-elasticloadbalancingv2-targets";
import GetsIPAddress from "./constructs/gets-ip-address";


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

    // get ip address of the neptune cluster
    const ipAddressFetcher = new GetsIPAddress(this, "GetsIPAddress", {
      domainName: cluster.clusterEndpoint.hostname,
    });
    const ipAddress = ipAddressFetcher.ipAddress();

    const port = cluster.clusterEndpoint.port;

    // add networking
    const lb = new NetworkLoadBalancer(this, "LoadBalancer", {
      vpc,
      internetFacing: true,
    });
    const listener = lb.addListener("Listener", {
      port: 8182,
      protocol: Protocol.TCP,
    });
    listener.addTargets("Target", {
      port,
      targets: [new IpTarget(ipAddress, port)],
      protocol: Protocol.TCP,
    });
    new CfnOutput(this, "ClusterIPAddress", {
      value: ipAddress,
    });
    new CfnOutput(this, "ClusterDomainName", {
      value: cluster.clusterEndpoint.hostname,
    });
    new CfnOutput(this, "ClusterPort", {
      value: port.toString(),
    });
    new CfnOutput(this, "NLBDomainName", {
      value: lb.loadBalancerDnsName,
    });
  }
};
