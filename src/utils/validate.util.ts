import { NextFunction, Request, Response } from "express";
import { Schema } from "yup";

export function validate(schema: Schema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.validate(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}
