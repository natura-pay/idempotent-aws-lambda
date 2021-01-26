/* eslint-disable sonarjs/no-duplicate-string */
import faker from "faker";
import { idempotencyHttpWrapper, Providers } from "../src";

const mockIsProcessing = jest.fn();
const mockUpdate = jest.fn();
const mockFetch = jest.fn();

jest.mock("../src/providers/dynamoDB", () => {
  return {
    DynamoDB: jest.fn().mockImplementation(() => {
      return {
        isProcessing: mockIsProcessing,
        update: mockUpdate,
        fetch: mockFetch,
      };
    }),
  };
});

describe("idempotency-http-wrapper", () => {
  const mockNow = Date.now();

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(mockNow);
  });

  describe("dynamoDB", () => {
    it("Should extract the ID from request ID", async () => {
      // Given
      const endpoint = faker.internet.url();
      const requestId = faker.random.uuid();
      const result = { word: faker.random.word() };
      const internalHandler = jest.fn().mockReturnValue(result);
      const ttl = faker.random.number();
      const tableName = faker.random.word();
      const handler = idempotencyHttpWrapper({
        handler: internalHandler,
        provider: {
          region: faker.random.word(),
          tableName,
          endpoint,
          name: Providers.DynamoDB,
        },
        ttl,
        id: {
          from: "requestId",
        },
      });

      const event = { requestContext: { requestId } };
      const context = {};

      // When
      await handler(event, context);

      // Then
      expect(internalHandler).toHaveBeenCalled();
      expect(mockUpdate).toBeCalledWith(requestId, result);
    });

    it("Should extract the ID from header request", async () => {
      // Given
      const endpoint = faker.internet.url();
      const requestId = faker.random.uuid();
      const result = { word: faker.random.word() };
      const internalHandler = jest.fn().mockReturnValue(result);
      const ttl = faker.random.number();
      const tableName = faker.random.word();
      const handler = idempotencyHttpWrapper({
        handler: internalHandler,
        provider: {
          region: faker.random.word(),
          tableName,
          endpoint,
          name: Providers.DynamoDB,
        },
        ttl,
        id: {
          from: "header",
          name: "requestId",
        },
      });

      const event = { headers: { requestId }, requestContext: {} };
      const context = {};

      // When
      await handler(event, context);

      // Then
      expect(internalHandler).toHaveBeenCalled();
      expect(mockUpdate).toBeCalledWith(requestId, result);
    });

    it("Should ignore the idempotency when the header is empty and fallback is disabled", async () => {
      // Given
      const endpoint = faker.internet.url();
      const result = { word: faker.random.word() };
      const internalHandler = jest.fn().mockReturnValue(result);
      const ttl = faker.random.number();
      const tableName = faker.random.word();
      const handler = idempotencyHttpWrapper({
        handler: internalHandler,
        provider: {
          region: faker.random.word(),
          tableName,
          endpoint,
          name: Providers.DynamoDB,
        },
        ttl,
        id: {
          from: "header",
          name: "requestId",
        },
      });
      const event = { headers: {}, requestContext: {} };
      const context = {};

      // When
      await handler(event, context);

      // Then
      expect(internalHandler).toHaveBeenCalled();
      expect(mockUpdate).not.toBeCalled();
    });

    it("Should apply the default TTL", async () => {
      // Given
      const endpoint = faker.internet.url();
      const requestId = faker.random.uuid();
      const result = { word: faker.random.word() };
      const internalHandler = jest.fn().mockReturnValue(result);
      const tableName = faker.random.word();
      const handler = idempotencyHttpWrapper({
        handler: internalHandler,
        provider: {
          region: faker.random.word(),
          tableName,
          endpoint,
          name: Providers.DynamoDB,
        },
        id: {
          from: "requestId",
        },
      });

      const event = { requestContext: { requestId } };
      const context = {};

      // When
      await handler(event, context);

      // Then
      expect(internalHandler).toHaveBeenCalled();
      expect(mockUpdate).toBeCalledWith(requestId, result);
    });

    it("Should ignore the request when already called using the request id", async () => {
      // Given
      const endpoint = faker.internet.url();
      const requestId = faker.random.uuid();
      const internalHandler = jest.fn();
      const ttl = faker.random.number();
      const tableName = faker.random.word();
      const handler = idempotencyHttpWrapper({
        handler: internalHandler,
        provider: {
          region: faker.random.word(),
          tableName,
          endpoint,
          name: Providers.DynamoDB,
        },
        ttl,
        id: {
          from: "requestId",
        },
      });
      mockIsProcessing.mockResolvedValue(true);

      const event = { requestContext: { requestId } };
      const context = {};
      // When
      await handler(event, context);

      // Then
      expect(internalHandler).not.toHaveBeenCalled();
      expect(mockFetch).toBeCalledWith(requestId);
    });

    it("Should ignore the request when already called using the header id", async () => {
      // Given
      const endpoint = faker.internet.url();
      const requestId = faker.random.uuid();
      const internalHandler = jest.fn();
      const ttl = faker.random.number();
      const tableName = faker.random.word();
      const handler = idempotencyHttpWrapper({
        handler: internalHandler,
        provider: {
          region: faker.random.word(),
          tableName,
          endpoint,
          name: Providers.DynamoDB,
        },
        ttl,
        id: {
          from: "header",
          name: "requestId",
        },
      });
      mockIsProcessing.mockResolvedValue(true);

      const event = { headers: { requestId }, requestContext: {} };
      const context = {};
      // When
      await handler(event, context);

      // Then
      expect(internalHandler).not.toHaveBeenCalled();
      expect(mockFetch).toBeCalledWith(requestId);
    });

    it("Should ignore the request when already called using the header id with fallback enabled", async () => {
      // Given
      const endpoint = faker.internet.url();
      const requestId = faker.random.uuid();
      const internalHandler = jest.fn();
      const ttl = faker.random.number();
      const tableName = faker.random.word();
      const handler = idempotencyHttpWrapper({
        handler: internalHandler,
        provider: {
          region: faker.random.word(),
          tableName,
          endpoint,
          name: Providers.DynamoDB,
        },
        ttl,
        id: {
          from: "header",
          name: "requestId",
          fallback: true,
        },
      });
      mockIsProcessing.mockResolvedValue(true);

      const event = { headers: {}, requestContext: { requestId } };
      const context = {};
      // When
      await handler(event, context);

      // Then
      expect(internalHandler).not.toHaveBeenCalled();
      expect(mockFetch).toBeCalledWith(requestId);
    });
  });
});
