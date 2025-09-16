import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import {
  AppError,
  ErrorCategory,
  createValidationError,
  toErrorResponse,
  maskSensitiveData,
  ERROR_CODES,
  ERROR_MESSAGES
} from '@shared/error-types';
import { handleZodError, catchAsync } from './global-error-handler';

// =============================================================================
// واجهات التحقق من صحة البيانات
// =============================================================================

interface ValidateRequestOptions {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
  // خيارات إضافية للتحكم في التحقق
  allowUnknown?: boolean; // السماح بحقول غير معرفة
  stripUnknown?: boolean; // إزالة الحقول غير المعرفة
  abortEarly?: boolean;   // التوقف عند أول خطأ
}

// =============================================================================
// Middleware التحقق من صحة البيانات المحسن
// =============================================================================

export function validateRequest(options: ValidateRequestOptions) {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const validationErrors: AppError[] = [];

    try {
      // التحقق من صحة body
      if (options.body) {
        try {
          req.body = options.body.parse(req.body);
        } catch (error) {
          if (error instanceof ZodError) {
            const appError = handleZodError(error);
            appError.details = {
              ...appError.details,
              section: 'body',
              originalData: maskSensitiveData(req.body) // ✅ تمويه البيانات الحساسة قبل التسجيل
            };
            validationErrors.push(appError);
          } else {
            throw error; // إعادة رمي الأخطاء غير ZodError
          }
        }
      }

      // التحقق من صحة query
      if (options.query) {
        try {
          req.query = options.query.parse(req.query);
        } catch (error) {
          if (error instanceof ZodError) {
            const appError = handleZodError(error);
            appError.details = {
              ...appError.details,
              section: 'query',
              originalData: maskSensitiveData(req.query) // ✅ تمويه البيانات الحساسة قبل التسجيل
            };
            validationErrors.push(appError);
          } else {
            throw error;
          }
        }
      }

      // التحقق من صحة params
      if (options.params) {
        try {
          req.params = options.params.parse(req.params);
        } catch (error) {
          if (error instanceof ZodError) {
            const appError = handleZodError(error);
            appError.details = {
              ...appError.details,
              section: 'params',
              originalData: maskSensitiveData(req.params) // ✅ تمويه البيانات الحساسة قبل التسجيل
            };
            validationErrors.push(appError);
          } else {
            throw error;
          }
        }
      }

      // إذا كانت هناك أخطاء تحقق، إرجاعها
      if (validationErrors.length > 0) {
        // إرجاع أول خطأ أو تجميع الأخطاء
        const firstError = validationErrors[0];
        
        if (validationErrors.length > 1) {
          // إضافة معلومات عن الأخطاء الإضافية
          firstError.details = {
            ...firstError.details,
            additionalErrors: validationErrors.slice(1).map(err => ({
              code: err.code,
              message: err.message,
              field: err.details?.field,
              section: err.details?.section
            }))
          };
        }

        // إرسال الخطأ لمعالج الأخطاء العام
        return next(firstError);
      }

      // إذا نجح التحقق، المتابعة
      next();

    } catch (error) {
      // معالجة الأخطاء غير المتوقعة
      const systemError = createValidationError(
        ERROR_CODES.VALIDATION_FORMAT,
        ERROR_MESSAGES.VALIDATION.INVALID_FORMAT.en
      );
      
      systemError.details = {
        originalError: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      };

      next(systemError);
    }
  });
}

// =============================================================================
// دوال مساعدة للتحقق من أنواع معينة من البيانات
// =============================================================================

export function validateBody(schema: AnyZodObject) {
  return validateRequest({ body: schema });
}

export function validateQuery(schema: AnyZodObject) {
  return validateRequest({ query: schema });
}

export function validateParams(schema: AnyZodObject) {
  return validateRequest({ params: schema });
}

export function validateAll(schemas: {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}) {
  return validateRequest(schemas);
}

// =============================================================================
// Middleware للتحقق من الحقول المطلوبة
// =============================================================================

export function requireFields(fields: string[], section: 'body' | 'query' | 'params' = 'body') {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const data = req[section];
    const missingFields: string[] = [];

    for (const field of fields) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      const error = createValidationError(
        ERROR_CODES.VALIDATION_REQUIRED,
        `Missing required fields: ${missingFields.join(', ')}`,
        missingFields[0],
        undefined
      );

      error.details = {
        missingFields,
        section,
        providedData: Object.keys(data)
      };

      return next(error);
    }

    next();
  });
}

// =============================================================================
// Middleware للتحقق من أنواع البيانات
// =============================================================================

export function validateTypes(
  fieldTypes: Record<string, 'string' | 'number' | 'boolean' | 'array' | 'object'>,
  section: 'body' | 'query' | 'params' = 'body'
) {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const data = req[section];
    const typeErrors: Array<{ field: string; expected: string; actual: string }> = [];

    for (const [field, expectedType] of Object.entries(fieldTypes)) {
      if (data[field] !== undefined) {
        const actualType = Array.isArray(data[field]) ? 'array' : typeof data[field];
        
        if (actualType !== expectedType) {
          typeErrors.push({
            field,
            expected: expectedType,
            actual: actualType
          });
        }
      }
    }

    if (typeErrors.length > 0) {
      const firstError = typeErrors[0];
      const error = createValidationError(
        ERROR_CODES.VALIDATION_FORMAT,
        `Field '${firstError.field}' should be ${firstError.expected}, but received ${firstError.actual}`,
        firstError.field,
        data[firstError.field]
      );

      error.details = {
        typeErrors,
        section
      };

      return next(error);
    }

    next();
  });
}

// =============================================================================
// دالة مساعدة لإنشاء middleware مخصص للتحقق
// =============================================================================

export function createCustomValidator<T>(
  validator: (data: T) => boolean | string,
  errorMessage: string,
  section: 'body' | 'query' | 'params' = 'body'
) {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const data = req[section] as T;
    const result = validator(data);

    if (result === false || typeof result === 'string') {
      const error = createValidationError(
        ERROR_CODES.VALIDATION_FORMAT,
        typeof result === 'string' ? result : errorMessage
      );

      error.details = {
        section,
        customValidation: true,
        data
      };

      return next(error);
    }

    next();
  });
}