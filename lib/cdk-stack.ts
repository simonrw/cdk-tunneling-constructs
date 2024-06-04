import { CfnOutput, CfnResource, NestedStack, RemovalPolicy, ResolutionTypeHint, Stack, type StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as neptune from '@aws-cdk/aws-neptune-alpha';
import { IpAddresses, Peer, Port, SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import PrivateTCPListener from "./constructs/private-tcp-listener";
import { CfnCacheCluster, CfnSubnetGroup } from "aws-cdk-lib/aws-elasticache";


export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);


    new NeptuneStack(this, "NeptuneStack");
    new ElasticacheStack(this, "ElasticacheStack");
  }
};

class ElasticacheStack extends NestedStack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, "VPC", {
      ipAddresses: IpAddresses.cidr("10.0.16.0/24"),
      natGateways: 1,
      subnetConfiguration: [
        {
          name: "public",
          subnetType: SubnetType.PUBLIC,
          cidrMask: 26,
        },
        {
          name: "private",
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 26,
        },
      ],
    });

    const securityGroup = new SecurityGroup(
      this,
      "RedisSecurityGroup",
      {
        securityGroupName: "redis-sec-group",
        vpc,
        allowAllOutbound: true,
      });
    securityGroup.addIngressRule(Peer.anyIpv4(), Port.allTcp());

    const subnet = new CfnSubnetGroup(this, "SubnetGroup", {
      subnetIds: vpc.privateSubnets.map(s => s.subnetId),
      description: "Elasticache subnet group",
    });

    const db = new CfnCacheCluster(this, "CacheCluster", {
      cacheSubnetGroupName: subnet.ref,
      cacheNodeType: "cache.t2.micro",
      engine: "redis",
      numCacheNodes: 1,
      vpcSecurityGroupIds: [securityGroup.securityGroupId],
    });
    db.applyRemovalPolicy(RemovalPolicy.DESTROY);

    new PrivateTCPListener(this, "TCPListener", {
      domainName: db.getAtt("RedisEndpoint.Address"),
      port: db.getAtt("RedisEndpoint.Port", ResolutionTypeHint.NUMBER),
      vpc,
    });
  }
}

class NeptuneStack extends NestedStack {
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

    new PrivateTCPListener(this, "TCPListener", {
      domainName: cluster.clusterEndpoint.hostname,
      port: cluster.clusterEndpoint.port,
      vpc,
    });

    new CfnOutput(this, "ClusterDomainName", {
      value: cluster.clusterEndpoint.hostname,
    });
    new CfnOutput(this, "ClusterPort", {
      value: cluster.clusterEndpoint.port.toString(),
    });
  }
}
