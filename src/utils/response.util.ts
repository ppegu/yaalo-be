import type { NextFunction, Request, Response } from "express";

// Define a generic error class
export class AppError extends Error {
  public status: number;
  public message: string;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.message = message;
  }
}

// Extend the generic error class for specific error types
export class NotFoundError extends AppError {
  constructor(message: string = "Not Found") {
    super(404, message);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = "Bad Request") {
    super(400, message);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = "Internal Server Error") {
    super(500, message);
  }
}

// Error handling middleware
export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof Error) {
    err = new InternalServerError(err.message);
  }
  const status = (err as AppError).status || 500;
  const message = (err as AppError).message || "Something went wrong";
  res.status(status).json({ status, message });
};

// Define a generic response class
export class AppResponse {
  public status: number;
  public message: string;
  public data?: any;

  constructor(status: number, message: string, data?: any) {
    this.status = status;
    this.message = message;
    this.data = data;
  }
}

// Success response middleware
export const successHandler = (
  response: AppResponse,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status = response.status || 200;
  const message = response.message || "Success";

  const data = response.data || null;
  res.status(status).json({ status, message, response: data });
};

export function responseHandler(
  response: AppResponse | AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (response instanceof AppResponse) {
    successHandler(response, req, res, next);
  } else {
    errorHandler(response, req, res, next);
  }
}
