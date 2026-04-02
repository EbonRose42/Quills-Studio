import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DevToolsService } from './service';

describe('DevToolsService', () => {
  let rootDirectory: string;
  let service: DevToolsService;

  beforeEach(async () => {
    rootDirectory = await mkdtemp(join(tmpdir(), 'quills-devtools-'));
    service = new DevToolsService({ rootDirectory });
    await service.init();
  });

  afterEach(async () => {
    await rm(rootDirectory, { recursive: true, force: true });
  });

  it('writes structured logs and exports a debug bundle', async () => {
    await service.log('info', 'test', 'hello world', { ok: true });
    const bundlePath = await service.exportDebugBundle('manual', { state: 'ok' });
    const snapshot = service.getSnapshot();
    const bundleState = await readFile(join(bundlePath, 'app-state.json'), 'utf8');

    expect(snapshot.recentEntries.length).toBeGreaterThan(0);
    expect(snapshot.lastBundlePath).toBe(bundlePath);
    expect(bundleState).toContain('"state": "ok"');
  });

  it('builds distilled diagnostics from recent log state', async () => {
    await service.log('error', 'provider', 'Provider request failed with 500.', { provider: 'ollama' });
    const distilled = service.buildDistilledDiagnostics({
      providerMode: 'ollama',
      providerStatus: {
        provider: 'ollama',
        displayName: 'Ollama',
        available: false,
        baseUrl: 'http://127.0.0.1:11434',
        lastCheckedAt: null,
        models: [],
        missingModels: ['magnum'],
        lastError: 'offline',
      },
      mcp: {
        servers: [],
        recentActivity: [],
        lastContextPack: null,
      },
    });

    expect(distilled.summary.length).toBeGreaterThan(0);
    expect(distilled.failures.some((line) => line.includes('provider'))).toBe(true);
  });
});
