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
  readonly url: string;
  readonly port: number;

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
    const ipAddress = ipAddressFetcher.ipAddress();

    // add networking
    const lb = new NetworkLoadBalancer(this, "LoadBalancer", {
      vpc: props.vpc,
      internetFacing: true,
    });

    const listener = lb.addListener("Listener", {
      port,
      protocol: Protocol.TCP,
    });

    listener.addTargets("Target", {
      port,
      targets: [new IpTarget(ipAddress, port)],
      protocol: Protocol.TCP,
    });

    // outputs
    new CfnOutput(this, "LBDomainName", {
      value: lb.loadBalancerDnsName,
    });

    this.url = lb.loadBalancerDnsName;
    this.port = port;
  }
}
