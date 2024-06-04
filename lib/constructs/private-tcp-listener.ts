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
  private ipAddress: string;

  constructor(scope: Construct, id: string, props: PrivateTCPListenerProps) {
    super(scope, id);

    // input handling
    let domainName;
    if (props.domainName instanceof Reference) {
      domainName = Token.asString(props.domainName);
    } else {
      domainName = props.domainName;
    }

    let port;
    if (props.port instanceof Reference) {
      port = Token.asNumber(props.port);
    } else {
      port = props.port;
    }

    // fetch the IP address of the domain
    const ipAddressFetcher = new GetsIPAddress(this, "GetsIPAddress", {
      domainName,
    });
    this.ipAddress = ipAddressFetcher.ipAddress();

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
      targets: [new IpTarget(this.ipAddress, port)],
      protocol: Protocol.TCP,
    });

    // outputs
    new CfnOutput(this, "LBDomainName", {
      value: this.lb.loadBalancerDnsName,
    });
  }

  // accessor for the domain name
  domainName(): string {
    return this.lb.loadBalancerDnsName;
  }
}
