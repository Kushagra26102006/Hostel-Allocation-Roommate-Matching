import type { Request, Response, NextFunction } from "express";
import { type AnyZodObject, ZodError } from "zod";
import { ValidationError } from "../errors/app-error.js";

interface RequestValidationSchema {
  body?: AnyZodObject | undefined;
  query?: AnyZodObject | undefined;
  params?: AnyZodObject | undefined;
  headers?: AnyZodObject | undefined;
}

export function validate(schema: RequestValidationSchema) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.headers) {
        req.headers = await schema.headers.parseAsync(req.headers);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const invalidParams = error.issues.map((i) => ({
          name: i.path.join("."),
          reason: i.message,
        }));
        next(new ValidationError("Invalid request parameters or payload", invalidParams));
      } else {
        next(error);
      }
    }
  };
}
