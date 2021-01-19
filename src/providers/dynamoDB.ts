import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Provider } from "./provider";

export interface DynamoDBOptions {
  endpoint?: string;
  region: string;
  tableName: string;
  ttl: number;
}

export class DynamoDB implements Provider {
  private readonly ddb: DocumentClient;

  private readonly ttl: number;

  private readonly tableName: string;

  public constructor(options: DynamoDBOptions) {
    this.ddb = new DocumentClient({
      endpoint: options.endpoint,
      region: options.region,
    });
    this.tableName = options.tableName;
    this.ttl = options.ttl;
  }

  public async fetch(messageId: string): Promise<any> {
    const result = await this.ddb
      .get({
        Key: { messageId },
        TableName: this.tableName,
      })
      .promise();

    return result.Item?.result;
  }

  public async isProcessing(messageId: string): Promise<boolean> {
    const creationTime = Math.floor(Date.now() / 1000);
    const ttl = creationTime + this.ttl;

    try {
      await this.ddb
        .transactWrite({
          TransactItems: [
            {
              Put: {
                TableName: this.tableName,
                Item: {
                  messageId: messageId,
                  ttl: ttl,
                },
                ConditionExpression:
                  "attribute_not_exists(messageId) or (#ttl < :validTime)",
                ExpressionAttributeNames: {
                  "#ttl": "ttl",
                },
                ExpressionAttributeValues: {
                  ":validTime": creationTime,
                },
              },
            },
          ],
          ClientRequestToken: messageId,
        })
        .promise();
      return false;
    } catch (error) {
      if (
        error.name.indexOf("ConditionalCheckFailed") !== -1 ||
        error.message.indexOf("ConditionalCheckFailed") !== -1 ||
        error.code === "IdempotentParameterMismatchException"
      ) {
        return true;
      }

      throw error;
    }
  }

  public async update(messageId: string, result: any): Promise<void> {
    const creationTime = Math.floor(Date.now() / 1000);
    const ttl = creationTime + this.ttl;

    await this.ddb
      .put({
        Item: { messageId, result, ttl },
        TableName: this.tableName,
      })
      .promise();
  }
}
