import type { JsonSchema } from './types';

/** Gemini `responseSchema` node (OpenAPI subset with upper-case types). */
export interface GeminiSchema {
  type: 'OBJECT' | 'ARRAY' | 'STRING' | 'INTEGER' | 'NUMBER' | 'BOOLEAN';
  properties?: Record<string, GeminiSchema>;
  required?: string[];
  items?: GeminiSchema;
  enum?: string[];
  description?: string;
}

const GEMINI_TYPES = {
  object: 'OBJECT',
  array: 'ARRAY',
  string: 'STRING',
  integer: 'INTEGER',
  number: 'NUMBER',
  boolean: 'BOOLEAN',
} as const;

/**
 * Converts a JsonSchema to Gemini's responseSchema format.
 * Rules: upper-case `type`; copy properties/items recursively; copy required, enum, description
 * as new arrays/strings; drop nothing else (JsonSchema has no other keys). Pure, never throws.
 * Example: {type:'object',properties:{a:{type:'string'}}} → {type:'OBJECT',properties:{a:{type:'STRING'}}}
 */
export function toGeminiSchema(schema: JsonSchema): GeminiSchema {
  const mapped = GEMINI_TYPES[schema.type];
  const converted: GeminiSchema = { type: mapped ?? 'OBJECT' };
  if (schema.properties) {
    const properties: Record<string, GeminiSchema> = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      properties[key] = toGeminiSchema(value);
    }
    converted.properties = properties;
  }
  if (schema.required) converted.required = [...schema.required];
  if (schema.items) converted.items = toGeminiSchema(schema.items);
  if (schema.enum) converted.enum = [...schema.enum];
  if (typeof schema.description === 'string') converted.description = schema.description.slice();
  return converted;
}
