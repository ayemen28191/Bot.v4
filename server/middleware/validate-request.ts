import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

interface ValidateRequestOptions {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

export function validateRequest(options: ValidateRequestOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // التحقق من صحة بيانات الطلب
      if (options.body) {
        req.body = options.body.parse(req.body);
      }
      
      if (options.query) {
        req.query = options.query.parse(req.query);
      }
      
      if (options.params) {
        req.params = options.params.parse(req.params);
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // إرجاع أخطاء التحقق من صحة البيانات
        return res.status(400).json({
          success: false,
          message: 'بيانات غير صالحة',
          errors: error.errors,
        });
      }
      
      // إرجاع خطأ داخلي للخادم لأي أخطاء أخرى
      return res.status(500).json({
        success: false,
        message: 'خطأ داخلي في الخادم',
      });
    }
  };
}