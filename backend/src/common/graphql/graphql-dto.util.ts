import { BadRequestException } from '@nestjs/common';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

export type JsonObject = Record<string, unknown>;

export async function toValidatedDto<T extends object>(
  dtoClass: ClassConstructor<T>,
  value?: JsonObject | null,
): Promise<T> {
  const dto = plainToInstance(dtoClass, value ?? {});
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
    validationError: {
      target: false,
      value: false,
    },
  });

  if (errors.length > 0) {
    throw new BadRequestException(errors);
  }

  return dto;
}

export function omitKeys<T extends JsonObject>(
  value: T | null | undefined,
  keys: string[],
): JsonObject {
  const source = value ?? {};
  const omitted = new Set(keys);

  return Object.fromEntries(
    Object.entries(source).filter(([key]) => !omitted.has(key)),
  );
}
