import { CfnOutput, Duration, Reference, Token } from "aws-cdk-lib";
import { Construct } from "constructs";
import GetsIPAddress from "./gets-ip-address";
import { NetworkLoadBalancer, Protocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { IpTarget } from "aws-cdk-lib/aws-elasticloadbalancingv2-targets";
import { IVpc } from "aws-cdk-lib/aws-ec2";

interface PrivateTCPListenerProps {
  domainName: string | Reference,
  port: number | Reference,
  vpc: IVpc,
  timeout?: Duration,
}

export default class PrivateTCPListener extends Construct {
  private lb: NetworkLoadBalancer;

  constructor(scope: Construct, id: string, props: PrivateTCPListenerProps) {
    super(scope, id);

    // get ip address of the neptune cluster
    let domainName;
    if (props.domainName instanceof Reference) {
      domainName = Token.asString(props.domainName);
    } else {
      domainName = props.domainName;
    }

    const ipAddressFetcher = new GetsIPAddress(this, "GetsIPAddress", {
      domainName,
    });
    const ipAddress = ipAddressFetcher.ipAddress();

    // add networking
    this.lb = new NetworkLoadBalancer(this, "LoadBalancer", {
      vpc: props.vpc,
      internetFacing: true,
    });

    let port;
    if (props.port instanceof Reference) {
      port = Token.asNumber(props.port);
    } else {
      port = props.port;
    }

    const listener = this.lb.addListener("Listener", {
      port,
      protocol: Protocol.TCP,
    });

    listener.addTargets("Target", {
      port,
      targets: [new IpTarget(ipAddress, port)],
      protocol: Protocol.TCP,
    });

    new CfnOutput(this, "LBDomainName", {
      value: this.lb.loadBalancerDnsName,
    });
  }

  domainName(): string {
    return this.lb.loadBalancerDnsName;
  }
}
