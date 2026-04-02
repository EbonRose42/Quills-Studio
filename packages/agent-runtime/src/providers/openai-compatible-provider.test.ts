import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAiCompatibleProvider } from './openai-compatible-provider';

describe('OpenAiCompatibleProvider', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('inspects model availability from an OpenAI-compatible models endpoint', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: 'gpt-4o-mini' }],
      }),
    }) as typeof fetch;

    const provider = new OpenAiCompatibleProvider({
      provider: 'openai-compatible',
      baseUrl: 'http://127.0.0.1:1234/v1',
      model: 'gpt-4o-mini',
      apiKey: '',
      timeoutMs: 100,
      maxRetries: 0,
      fallbackToMock: true,
      thinking: false,
    });

    const status = await provider.inspect();
    expect(status.available).toBe(true);
    expect(status.missingModels).toHaveLength(0);
  });
});
