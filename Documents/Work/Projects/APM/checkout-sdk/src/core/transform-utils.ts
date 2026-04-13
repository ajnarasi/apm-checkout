/**
 * Transform Utilities — Shared amount/field transforms matching config.json patterns.
 *
 * These mirror the transforms declared in each APM's config.json:
 * MULTIPLY_100, DIVIDE_100, NUMBER_TO_STRING, STRING_TO_NUMBER,
 * DECIMAL_TO_STRING_CENTS, STRING_CENTS_TO_DECIMAL, MAP_ENUM, CONCAT, PASSTHROUGH
 */

export function multiply100(value: number): number {
  if (!Number.isFinite(value)) throw new Error(`Cannot transform non-finite value: ${value}`);
  return Math.round(value * 100);
}

export function divide100(value: number): number {
  if (!Number.isFinite(value)) throw new Error(`Cannot transform non-finite value: ${value}`);
  return value / 100;
}

export function numberToString(value: number): string {
  if (!Number.isFinite(value)) throw new Error(`Cannot transform non-finite value: ${value}`);
  return value.toFixed(2);
}

export function stringToNumber(value: string): number {
  const num = parseFloat(value);
  if (!Number.isFinite(num)) throw new Error(`Cannot parse "${value}" as number`);
  return num;
}

export function decimalToStringCents(value: number): string {
  return String(multiply100(value));
}

export function stringCentsToDecimal(value: string): number {
  const cents = parseInt(value, 10);
  if (!Number.isFinite(cents)) throw new Error(`Cannot parse "${value}" as cents`);
  return divide100(cents);
}

export function mapEnum<T extends string>(
  value: string,
  mapping: Record<string, T>,
  fallback?: T
): T {
  const result = mapping[value];
  if (result !== undefined) return result;
  if (fallback !== undefined) return fallback;
  throw new Error(`No mapping for enum value "${value}". Known values: ${Object.keys(mapping).join(', ')}`);
}

export function concat(values: string[], separator = ' '): string {
  return values.filter(Boolean).join(separator);
}

export function passthrough<T>(value: T): T {
  return value;
}

export function validateAmount(amount: number): void {
  if (!Number.isFinite(amount)) throw new Error(`Invalid amount: ${amount} (must be a finite number)`);
  if (amount < 0) throw new Error(`Invalid amount: ${amount} (must be non-negative)`);
  if (amount === 0) throw new Error(`Invalid amount: 0 (must be greater than zero)`);
}

export function validateCurrency(currency: string): void {
  if (!currency || currency.length !== 3) {
    throw new Error(`Invalid currency: "${currency}" (must be 3-letter ISO 4217 code)`);
  }
}

/**
 * Apply a named transform from config.json to a value.
 */
export function applyTransform(
  value: unknown,
  transform: string,
  options?: { enumMap?: Record<string, string> }
): unknown {
  switch (transform) {
    case 'PASSTHROUGH':
    case 'NONE':
      return value;
    case 'MULTIPLY_100':
      return multiply100(value as number);
    case 'DIVIDE_100':
      return divide100(value as number);
    case 'NUMBER_TO_STRING':
      return numberToString(value as number);
    case 'STRING_TO_NUMBER':
      return stringToNumber(value as string);
    case 'DECIMAL_TO_STRING_CENTS':
      return decimalToStringCents(value as number);
    case 'STRING_CENTS_TO_DECIMAL':
      return stringCentsToDecimal(value as string);
    case 'MAP_ENUM':
      return mapEnum(value as string, options?.enumMap ?? {});
    case 'CONCAT':
      return Array.isArray(value) ? concat(value as string[]) : value;
    default:
      throw new Error(`Unknown transform: ${transform}`);
  }
}
