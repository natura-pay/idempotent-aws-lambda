import { DynamoDB } from "../../src/providers/dynamoDB";
import {
  mockDynamoDBPromise,
  mockGetFunction,
  mockTransactWriteFunction,
  mockPutFunction,
} from "../../__mocks__/aws-sdk/clients/dynamodb";

describe("DynamoDB", () => {
  const mockNow = Date.now();

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(mockNow);

    mockDynamoDBPromise.mockClear();
    mockGetFunction.mockClear();
    mockTransactWriteFunction.mockClear();
  });

  describe("fetch", () => {
    it("Should return the item when exists", async () => {
      // Given
      const endpoint: string = "http://localhost";
      const word: string = "aws-region";

      const dynamoDB = new DynamoDB({
        endpoint: endpoint,
        region: "aws-region",
        ttl: 123456789,
        tableName: "aws-region",
      });
      const messageId = "uuid-v4";
      const expectedResult = { word: word };
      mockDynamoDBPromise.mockResolvedValue({
        Item: {
          result: expectedResult,
        },
      });

      // When
      const result: any = await dynamoDB.fetch(messageId);

      // Then
      expect(result).toStrictEqual(expectedResult);
      expect(mockGetFunction).toBeCalledWith({
        Key: {
          messageId: messageId,
        },
        TableName: "aws-region",
      });
    });

    it("Should return undefined when the item doesn't exist", async () => {
      // Given
      const endpoint: string = "http://localhost";
      const dynamoDB = new DynamoDB({
        endpoint: endpoint,
        region: "aws-region",
        ttl: 123456789,
        tableName: "aws-region",
      });
      const messageId = "uuid-v4";
      mockDynamoDBPromise.mockResolvedValue({
        Item: {
          result: undefined,
        },
      });

      // When
      const result = await dynamoDB.fetch(messageId);

      // Then
      expect(result).toBeUndefined();
      expect(mockGetFunction).toBeCalledWith({
        Key: {
          messageId: messageId,
        },
        TableName: "aws-region",
      });
    });
  });

  describe("isProcessing", () => {
    it("Should return false when the message isn't processing", async () => {
      // Given
      const endpoint: string = "http://localhost";
      const now = Math.floor(mockNow / 1000);

      const dynamoDB = new DynamoDB({
        endpoint: endpoint,
        region: "aws-region",
        ttl: 10,
        tableName: "aws-region",
      });
      const messageId = "uuid-v4";

      // When
      const result = await dynamoDB.isProcessing(messageId);

      // Then
      expect(result).toBeFalsy();
      expect(mockDynamoDBPromise).toBeCalledTimes(1);
      expect(mockTransactWriteFunction).toBeCalledWith({
        ClientRequestToken: messageId,
        TransactItems: [
          {
            Put: {
              ConditionExpression:
                "attribute_not_exists(messageId) or (#ttl < :validTime)",
              ExpressionAttributeNames: {
                "#ttl": "ttl",
              },
              ExpressionAttributeValues: {
                ":validTime": now,
              },
              Item: {
                messageId: messageId,
                ttl: now + 10,
              },
              TableName: "aws-region",
            },
          },
        ],
      });
    });

    it("Should return true when the message is in processing", async () => {
      // Given
      const endpoint: string = "http://localhost";
      const now = Math.floor(Date.now() / 1000);

      const dynamoDB = new DynamoDB({
        endpoint: endpoint,
        region: "aws-region",
        ttl: 10,
        tableName: "aws-region",
      });
      const messageId = "uuid-v4";
      mockDynamoDBPromise.mockRejectedValue({
        name: "ConditionalCheckFailed",
        message:
          "Transaction cancelled, please refer cancellation reasons for specific reasons [ConditionalCheckFailed]",
      });

      // When
      const result = await dynamoDB.isProcessing(messageId);

      // Then
      expect(result).toBeTruthy();
      expect(mockDynamoDBPromise).toBeCalledTimes(1);
      expect(mockTransactWriteFunction).toBeCalledWith({
        ClientRequestToken: "uuid-v4",
        TransactItems: [
          {
            Put: {
              ConditionExpression:
                "attribute_not_exists(messageId) or (#ttl < :validTime)",
              ExpressionAttributeNames: {
                "#ttl": "ttl",
              },
              ExpressionAttributeValues: {
                ":validTime": now,
              },
              Item: {
                messageId: "uuid-v4",
                ttl: now + 10,
              },
              TableName: "aws-region",
            },
          },
        ],
      });
    });

    it("Should thrown an error when some internal error happen", async (): Promise<void> => {
      // Given
      const endpoint: string = "http://localhost";
      const dynamoDB = new DynamoDB({
        endpoint: endpoint,
        region: "aws-region",
        ttl: 123456789,
        tableName: "aws-region",
      });
      const messageId = "uuid-v4";
      mockTransactWriteFunction.mockRejectedValue(
        new Error("unexptected error")
      );

      // When
      const promise = dynamoDB.isProcessing(messageId);

      // Then
      return expect(promise).rejects.toThrow();
    });
  });

  describe("update", () => {
    it("Should update the item with successfully", async (): Promise<void> => {
      // Given
      const endpoint: string = "http://localhost";
      const messageId = "uuid-v4";
      const ttl = 10;
      const now = Math.floor(Date.now() / 1000);
      const word = "aws-region";
      const tableName = "aws-region";
      const dynamoDB = new DynamoDB({
        endpoint: endpoint,
        region: "aws-region",
        ttl: ttl,
        tableName: tableName,
      });
      const data = { word: word };

      // When
      const promise = dynamoDB.update(messageId, data);

      // Then
      expect(promise).resolves.not.toThrow();
      expect(mockDynamoDBPromise).toBeCalledTimes(1);
      expect(mockPutFunction).toBeCalledWith({
        Item: {
          messageId: "uuid-v4",
          result: {
            word: "aws-region",
          },
          ttl: now + 10,
        },
        TableName: "aws-region",
      });
    });
  });
});
