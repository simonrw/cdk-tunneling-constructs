import { CfnOutput, CfnResource, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as neptune from '@aws-cdk/aws-neptune-alpha';
import { IpAddresses, Vpc } from "aws-cdk-lib/aws-ec2";
import PrivateTCPListener from "./constructs/private-tcp-listener";


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

    const privateListener = new PrivateTCPListener(this, "TCPListener", {
      domainName: cluster.clusterEndpoint.hostname,
      port: cluster.clusterEndpoint.port,
      vpc,
    });

    new CfnOutput(this, "ClusterDomainName", {
      value: cluster.clusterEndpoint.hostname,
    });
    new CfnOutput(this, "ClusterPort", {
      value: cluster.clusterEndpoint.toString(),
    });
    new CfnOutput(this, "NLBDomainName", {
      value: privateListener.domainName(),
    });
  }
};
