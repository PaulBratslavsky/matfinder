import { describe, expect, it } from 'vitest';
import { knowledgeKey } from '../../src/plugins/matfinder/server/src/domain/knowledge';

describe('knowledgeKey', () => {
  it('is the gym documentId and the trimmed, lowercased question', () => {
    expect(knowledgeKey('doc1', '  Is there Parking? ')).toBe('doc1|is there parking?');
  });

  it('uses * for an entry about every gym', () => {
    expect(knowledgeKey(null, 'X')).toBe('*|x');
  });
});
