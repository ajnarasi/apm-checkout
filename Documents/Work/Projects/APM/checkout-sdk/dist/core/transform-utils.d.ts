/**
 * Transform Utilities — Shared amount/field transforms matching config.json patterns.
 *
 * These mirror the transforms declared in each APM's config.json:
 * MULTIPLY_100, DIVIDE_100, NUMBER_TO_STRING, STRING_TO_NUMBER,
 * DECIMAL_TO_STRING_CENTS, STRING_CENTS_TO_DECIMAL, MAP_ENUM, CONCAT, PASSTHROUGH
 */
export declare function multiply100(value: number): number;
export declare function divide100(value: number): number;
export declare function numberToString(value: number): string;
export declare function stringToNumber(value: string): number;
export declare function decimalToStringCents(value: number): string;
export declare function stringCentsToDecimal(value: string): number;
export declare function mapEnum<T extends string>(value: string, mapping: Record<string, T>, fallback?: T): T;
export declare function concat(values: string[], separator?: string): string;
export declare function passthrough<T>(value: T): T;
export declare function validateAmount(amount: number): void;
export declare function validateCurrency(currency: string): void;
/**
 * Apply a named transform from config.json to a value.
 */
export declare function applyTransform(value: unknown, transform: string, options?: {
    enumMap?: Record<string, string>;
}): unknown;
//# sourceMappingURL=transform-utils.d.ts.map