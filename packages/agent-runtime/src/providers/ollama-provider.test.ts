import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OllamaProvider } from './ollama-provider';

describe('OllamaProvider', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('inspects model availability from Ollama tags', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [{ name: 'gemma3:12b' }, { name: 'eva-qwen2.5' }, { name: 'magnum' }],
      }),
    }) as typeof fetch;

    const provider = new OllamaProvider();
    const status = await provider.inspect();

    expect(status.available).toBe(true);
    expect(status.missingModels).toHaveLength(0);
  });

  it('falls back to the mock provider when Ollama is offline and fallback is enabled', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED')) as typeof fetch;

    const provider = new OllamaProvider({
      fallbackToMock: true,
      baseUrl: 'http://127.0.0.1:11434',
      timeoutMs: 100,
      maxRetries: 0,
    });

    const result = await provider.run('prose-drafter', {
      prompt: 'Draft the scene.',
      packet: {
        taskType: 'drafting',
        project: 'demo',
        book: 1,
        chapter: 1,
        pov: 'Mira',
        toneTargets: ['tense'],
        chapterGoal: 'Test goal',
        scenePlan: ['Beat one'],
        mustInclude: ['Mira enters the room'],
        mustAvoid: ['Do not end the series'],
        relevantCharacterNotes: ['Mira is exacting.'],
        relevantWorldNotes: ['The room is flooded.'],
        continuityWarnings: ['Do not introduce new canon.'],
        priorChapterSummary: 'Prior summary',
        styleReminders: ['Use concise prose.'],
        sourceArtifactIds: ['plan_v1'],
      },
    });

    expect(result.summary).toContain('fell back to mock provider');
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
