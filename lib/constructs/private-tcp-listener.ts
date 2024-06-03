import { Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import GetsIPAddress from "./gets-ip-address";
import { NetworkLoadBalancer, Protocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { IpTarget } from "aws-cdk-lib/aws-elasticloadbalancingv2-targets";
import { IVpc } from "aws-cdk-lib/aws-ec2";

interface PrivateTCPListenerProps {
  domainName: string,
  port: number,
  vpc: IVpc,
  timeout?: Duration,
}

export default class PrivateTCPListener extends Construct {
  private lb: NetworkLoadBalancer;

  constructor(scope: Construct, id: string, props: PrivateTCPListenerProps) {
    super(scope, id);

    // get ip address of the neptune cluster
    const ipAddressFetcher = new GetsIPAddress(this, "GetsIPAddress", {
      domainName: props.domainName,
    });
    const ipAddress = ipAddressFetcher.ipAddress();

    const port = props.port;

    // add networking
    this.lb = new NetworkLoadBalancer(this, "LoadBalancer", {
      vpc: props.vpc,
      internetFacing: true,
    });
    const listener = this.lb.addListener("Listener", {
      port,
      protocol: Protocol.TCP,
    });
    listener.addTargets("Target", {
      port,
      targets: [new IpTarget(ipAddress, port)],
      protocol: Protocol.TCP,
    });
  }

  domainName(): string {
    return this.lb.loadBalancerDnsName;
  }
}
