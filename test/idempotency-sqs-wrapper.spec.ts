/* eslint-disable */
import faker = require("faker");
import { idempotencySQSWrapper } from "../src/idempotency-sqs-wrapper";
import { mockDeleteFunction } from "../__mocks__/aws-sdk/clients/sqs";
import { Providers } from "../src/providers";

jest.setTimeout(10000);

const mockIsProcessing = jest.fn();
jest.mock("../src/providers/dynamoDB", () => {
  return {
    DynamoDB: jest.fn().mockImplementation(() => {
      return {
        isProcessing: mockIsProcessing,
      };
    }),
  };
});

describe("idempotency-sqs-wrapper", () => {
  const mockNow = Date.now();

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(mockNow);
    // nock.disableNetConnect();
  });

  afterEach(() => {
    // nock.cleanAll();
    // nock.enableNetConnect();
  });

  describe("dynamoDB", () => {
    it("Should pass all the records if they aren't executed yet", async () => {
      // Given
      const endpointDynamo = faker.internet.url();
      const endpointSQS = faker.internet.url();
      const messageId = faker.random.uuid();
      const internalHandler = jest.fn();
      const ttl = faker.random.number();
      const tableName = faker.random.word();

      const handler = idempotencySQSWrapper({
        handler: internalHandler,
        provider: {
          region: "us-east-1",
          tableName,
          endpoint: endpointDynamo,
          name: Providers.DynamoDB,
        },
        queue: {
          url: endpointSQS,
          region: "us-east-1",
        },
        ttl,
      });

      const bodyMessage =
        '{\n  "Type" : "Notification",\n  "MessageId" : "522a4e99-206a-5543-882a-190be7f974c5",\n  "TopicArn" : "arn:aws:sns:us-east-1:773374622004:payment-boletos-dev",\n  "Message" : "{\\"event\\":{\\"commitTimestamp\\":1593016163521,\\"eventType\\":\\"ISSUED_BOLETO\\"},\\"stream\\":{\\"aggregation\\":\\"BOLETO\\",\\"id\\":\\"1474245c-414e-43b5-bb6a-c9690c5579a0\\"}}",\n  "Timestamp" : "2020-07-22T23:01:39.707Z",\n  "SignatureVersion" : "1",\n  "Signature" : "dTJ202lG2N27UaQt3U3J1OExkeAMHu+7rPVcJf8DlQ20qxCswHCYXfuY7/Ql8VSWYPgQdoQi7s83mMlRcXLo0p2blysit2bhzWeTDcu0KTglHHmVScbeaRyZYecSFG2lZAYL6YW/Pnx+XQrT+drDqu6JMfGF297qDeHiaJb/PKlRlGhUzRi7i8srCefOrKmHvGuGruefW6RsGvt5kfupxqj92GYTvEDdojA0a4CB6xEKHqIztX0dPrtIGZiZD4xfmgXDWeXxZAnmXwSERnR2aiapUR/N4+yCB8Sj8dgGwMAaJ6sDf5v9vS8Ef91NH6sVQ6/KKgBDq4PP+koiaKg5Kw==",\n  "SigningCertURL" : "https://sns.us-east-1.amazonaws.com/SimpleNotificationService-a86cb10b4e1f29c941702d737128f7b6.pem",\n  "UnsubscribeURL" : "https://sns.us-east-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:us-east-1:773374622004:boletos-dev:5bc20359-a627-4f48-9d87-8896559a9d29",\n  "MessageAttributes" : {\n    "eventType" : {"Type":"String","Value":"ISSUED_BOLETO"}\n  }\n}';
      const event = { Records: [{ messageId, body: bodyMessage }] };
      const context = {};

      // When
      await handler(event, context);

      // Then
      expect(internalHandler).toHaveBeenCalledWith(event, context);
      expect(mockIsProcessing).toBeCalledWith(messageId);
      expect(mockDeleteFunction).not.toBeCalled();
    });

    it("Should filter the record if they already executed", async () => {
      // Given
      const endpointDynamo = faker.internet.url();
      const endpointSQS = faker.internet.url();
      const messageId = faker.random.uuid();
      const receiptHandle = faker.random.uuid();
      const internalHandler = jest.fn();
      const ttl = faker.random.number();
      const tableName = faker.random.word();
      const handler = idempotencySQSWrapper({
        handler: internalHandler,
        provider: {
          region: faker.random.word(),
          tableName,
          endpoint: endpointDynamo,
          name: Providers.DynamoDB,
        },
        queue: {
          url: endpointSQS,
          region: faker.random.word(),
        },
        ttl,
      });
      mockIsProcessing.mockResolvedValue(true);

      const event = { Records: [{ messageId, receiptHandle }] };
      const expectedEvent = { Records: [] };
      const context = {};

      // When
      await handler(event, context);

      // Then
      expect(internalHandler).toHaveBeenCalledWith(expectedEvent, context);
      expect(mockIsProcessing).toBeCalledWith(messageId);
      expect(mockDeleteFunction).toBeCalledWith({
        QueueUrl: endpointSQS,
        ReceiptHandle: receiptHandle,
      });
    });

    it("Should apply the default TTL", async () => {
      // Given
      const endpointDynamo = faker.internet.url();
      const endpointSQS = faker.internet.url();
      const messageId = faker.random.uuid();
      const internalHandler = jest.fn();

      const tableName = faker.random.word();
      const handler = idempotencySQSWrapper({
        handler: internalHandler,
        provider: {
          region: faker.random.word(),
          tableName,
          endpoint: endpointDynamo,
          name: Providers.DynamoDB,
        },
        queue: {
          url: endpointSQS,
          region: faker.random.word(),
        },
      });

      const event = { Records: [{ messageId }] };
      const context = {};

      // When
      await handler(event, context);

      // Then
      expect(internalHandler).toHaveBeenCalledWith(event, context);
      expect(mockIsProcessing).toBeCalledWith(messageId);
    });
  });
});
