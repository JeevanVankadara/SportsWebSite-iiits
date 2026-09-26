// Thrown from handlers; the error middleware turns it into { message } with this status.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
