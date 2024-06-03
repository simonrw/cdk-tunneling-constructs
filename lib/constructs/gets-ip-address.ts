import { CustomResource, Duration } from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Provider } from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";

interface GetsIPAddressProps {
  domainName: string,
  timeout?: Duration,
}

export default class GetsIPAddress extends Construct {
  private cr: CustomResource;

  constructor(scope: Construct, id: string, { domainName, timeout }: GetsIPAddressProps) {
    super(scope, id);

    const fn = new NodejsFunction(this, "Handler", {
      runtime: Runtime.NODEJS_18_X,
      timeout: timeout || Duration.minutes(2),
    });

    const provider = new Provider(this, "Provider", {
      onEventHandler: fn,
      logGroup: new LogGroup(this, "ProviderLogs", {
        retention: RetentionDays.ONE_DAY,
      }),
    });

    this.cr = new CustomResource(this, "Resource", {
      serviceToken: provider.serviceToken,
      properties: {
        DomainName: domainName
      }
    });
  }

  ipAddress(): string {
    return this.cr.getAttString("IPAddress");
  }
}

