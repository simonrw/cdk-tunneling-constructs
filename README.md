# Expose private resources to the public network

**Do not use this** 😂

## Installation

```bash
npm install https://github.com/simonrw/cdk-tunneling-constructs
```

```typescript
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";

import PrivateTCPListener from "./constructs/private-tcp-listener";

class MyStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // create your resource

    // expose your resource
    new PrivateTCPListener(this, "TCPListener", {
      domainName: "", /* either string or Reference */
      port: 10101, /* either number or Reference */
      vpc,
    });
  }
}
```

This generates a stack output that can be used to access the domain name and port.
