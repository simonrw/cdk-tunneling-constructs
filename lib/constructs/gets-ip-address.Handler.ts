import { Handler } from 'aws-lambda';
import * as dns from 'dns/promises';
import { v4 } from 'uuid';

const sleep = async (duration: number) => {
  return new Promise(resolve => setTimeout(resolve, duration));
};

// infinite loop and rely on the lambda function to time out
const getIPAddress = async (domainName: string, sleepTime?: number): Promise<string> => {
  const sleepTimeValue = sleepTime || 2000;

  while (true) {
    try {
      const lookupResult = await dns.lookup(domainName, { all: true, });
      console.log(`lookup result: ${JSON.stringify(lookupResult)}`);

      if (lookupResult.length == 0) {
        await sleep(sleepTimeValue);
        continue;
      }

      return lookupResult[0].address;

    } catch (e) {
      console.error(`Error looking up domain name: ${e}, sleeping to try again`);
      await sleep(sleepTimeValue);
    }
  }
}

const onCreate = async ({ ResourceProperties }, context) => {
  console.log('Handling create event');

  return {
    PhysicalResourceId: v4(),
    Data: {
      IPAddress: await getIPAddress(ResourceProperties.DomainName),
    },
  };
};

const onUpdate = async ({ ResourceProperties }, context) => {
  console.log('Handling update event');

  return {
    PhysicalResourceId: v4(),
    Data: {
      IPAddress: getIPAddress(ResourceProperties.DomainName),
    },
  };
};

const onDelete = async (event, context) => { };

export const handler: Handler = async (event, context) => {
  console.log('EVENT: \n' + JSON.stringify(event, null, 2));

  try {

    switch (event.RequestType) {
      case "Create":
        return await onCreate(event, context);
      case "Update":
        return await onUpdate(event, context);
      case "Delete":
        return await onDelete(event, context);
      default:
        throw new Error(`Invalid event type '${event.RequestType}'`);
    }

  } catch (e) {
    console.error(`Error handling event: ${e}`);
  }
};
