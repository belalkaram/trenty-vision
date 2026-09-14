export class AppError extends Error {
  public statusCode: number;
  public errors: Record<string, string[]> | null;

  constructor(message: string, statusCode = 500, errors: Record<string, string[]> | null = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden - Insufficient permissions') {
    super(message, 403);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors: Record<string, string[]> | null = null) {
    super(message, 422, errors);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
  }
}
