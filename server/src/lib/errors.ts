export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}
