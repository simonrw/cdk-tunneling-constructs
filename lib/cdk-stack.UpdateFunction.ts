import { Handler } from 'aws-lambda';
import * as dns from 'dns/promises';

export const handler: Handler = async (event, context) => {
  console.log('EVENT: \n' + JSON.stringify(event, null, 2));


  const lbURL = process.env.CLUSTER_DOMAIN;
  if (!lbURL) {
    throw new Error("no cluster domain specified");
  }
  const lookupResult = await dns.lookup(lbURL, { all: true, });
  console.log(`LOOKUP RESULT: ${JSON.stringify(lookupResult)}`);

  return context.logStreamName;
};
