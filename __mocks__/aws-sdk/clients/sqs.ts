export const mockSQSPromise = jest.fn().mockReturnValue(Promise.resolve(true));

const sendMessageFn = jest
  .fn()
  .mockImplementation(() => ({ promise: mockSQSPromise }));
export const mockDeleteFunction = jest
  .fn()
  .mockImplementation(() => ({ promise: mockSQSPromise }));

export class SQS {
  public sendMessage = sendMessageFn;
  public deleteMessage = mockDeleteFunction;
}
