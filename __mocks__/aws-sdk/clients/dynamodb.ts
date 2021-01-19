export const mockDynamoDBPromise = jest
  .fn()
  .mockReturnValue(Promise.resolve(true));

export const mockGetFunction = jest
  .fn()
  .mockImplementation(() => ({ promise: mockDynamoDBPromise }));

export const mockPutFunction = jest
  .fn()
  .mockImplementation(() => ({ promise: mockDynamoDBPromise }));

const queryFn = jest
  .fn()
  .mockImplementation(() => ({ promise: mockDynamoDBPromise }));

export const mockTransactWriteFunction = jest
  .fn()
  .mockImplementation(() => ({ promise: mockDynamoDBPromise }));

export class DocumentClient {
  public get = mockGetFunction;
  public transactWrite = mockTransactWriteFunction;
  public put = mockPutFunction;
  public query = queryFn;
}
