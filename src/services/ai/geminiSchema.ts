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

/**
 * Converts a JsonSchema to Gemini's responseSchema format.
 * Rules: upper-case `type`; copy properties/items recursively; copy required, enum, description
 * as new arrays/strings; drop nothing else (JsonSchema has no other keys). Pure, never throws.
 * Example: {type:'object',properties:{a:{type:'string'}}} → {type:'OBJECT',properties:{a:{type:'STRING'}}}
 */
export function toGeminiSchema(schema: JsonSchema): GeminiSchema {
  // TODO(T-012): implement per the rules above.
  void schema;
  return { type: 'OBJECT' };
}
