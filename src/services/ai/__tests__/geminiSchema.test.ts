import { JOB_ANALYSIS_SCHEMA } from '../schemas';
import { toGeminiSchema, type GeminiSchema } from '../geminiSchema';
import type { JsonSchema } from '../types';

const TYPE_MAP: Record<JsonSchema['type'], GeminiSchema['type']> = {
  object: 'OBJECT',
  array: 'ARRAY',
  string: 'STRING',
  integer: 'INTEGER',
  number: 'NUMBER',
  boolean: 'BOOLEAN',
};

function expectConverted(source: JsonSchema, converted: GeminiSchema): void {
  expect(converted.type).toBe(TYPE_MAP[source.type]);
  if (source.required) {
    expect(converted.required).toEqual([...source.required]);
    expect(converted.required).not.toBe(source.required);
  }
  if (source.enum) {
    expect(converted.enum).toEqual([...source.enum]);
    expect(converted.enum).not.toBe(source.enum);
  }
  if (source.description !== undefined) expect(converted.description).toBe(source.description);
  if (source.properties) {
    for (const [key, child] of Object.entries(source.properties)) {
      const next = converted.properties?.[key];
      expect(next).toBeDefined();
      if (next) expectConverted(child, next);
    }
  }
  if (source.items) {
    expect(converted.items).toBeDefined();
    if (converted.items) expectConverted(source.items, converted.items);
  }
}

describe('toGeminiSchema', () => {
  it('upper-cases types at every depth and copies required and enum arrays', () => {
    const converted = toGeminiSchema(JOB_ANALYSIS_SCHEMA);
    expectConverted(JOB_ANALYSIS_SCHEMA, converted);
    expect(converted.properties?.recommendedResumeId?.description).toBe('id from Resumes, or -1 if there are none');
    expect(converted.properties?.isJobPosting?.type).toBe('BOOLEAN');
    expect(converted.properties?.isJobPosting?.description).toBe(
      'false for login or sign-up pages, search results or lists of several jobs, company home pages, articles',
    );
  });
});
