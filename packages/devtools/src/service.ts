import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ProviderMode, ProviderStatus } from '@quills/shared';
import type { McpHostSnapshot } from '@quills/mcp';
import { distillDiagnostics, type DistilledDiagnostics } from './distill';

export type DevLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface DevLogEntry {
  id: string;
  timestamp: string;
  level: DevLogLevel;
  category: string;
  message: string;
  context: Record<string, unknown>;
}

export interface ActionMetric {
  name: string;
  successCount: number;
  failureCount: number;
  lastDurationMs: number;
  averageDurationMs: number;
  lastRunAt: string;
  lastStatus: 'success' | 'failure';
}

export interface DevToolsSnapshot {
  verboseLogging: boolean;
  logDirectory: string;
  appLogPath: string;
  errorLogPath: string;
  sessionLogPath: string;
  lastBundlePath: string | null;
  recentEntries: DevLogEntry[];
  recentErrors: DevLogEntry[];
  actionMetrics: ActionMetric[];
  distilledDiagnostics: DistilledDiagnostics;
}

export interface DevToolsServiceOptions {
  rootDirectory: string;
  verboseLogging?: boolean;
}

function now(): string {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '"[unserializable]"';
  }
}

function formatLogLine(entry: DevLogEntry): string {
  return `[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.category}: ${entry.message} ${safeJson(entry.context)}\n`;
}

export class DevToolsService {
  readonly sessionId = makeId('session');
  readonly logDirectory: string;
  readonly appLogPath: string;
  readonly errorLogPath: string;
  readonly sessionLogPath: string;
  readonly bundlesDirectory: string;

  private readonly recentEntries: DevLogEntry[] = [];
  private readonly recentErrors: DevLogEntry[] = [];
  private readonly actionMetrics = new Map<string, ActionMetric>();
  private lastBundlePath: string | null = null;
  private verboseLogging: boolean;

  constructor(options: DevToolsServiceOptions) {
    this.logDirectory = join(options.rootDirectory, 'logs');
    this.appLogPath = join(this.logDirectory, 'app.log');
    this.errorLogPath = join(this.logDirectory, 'error.log');
    this.sessionLogPath = join(this.logDirectory, 'sessions', `${this.sessionId}.jsonl`);
    this.bundlesDirectory = join(this.logDirectory, 'bundles');
    this.verboseLogging = options.verboseLogging ?? true;
  }

  async init(): Promise<void> {
    await mkdir(this.logDirectory, { recursive: true });
    await mkdir(join(this.logDirectory, 'sessions'), { recursive: true });
    await mkdir(this.bundlesDirectory, { recursive: true });
    await this.log('info', 'devtools', 'DevToolsService initialized.', { sessionId: this.sessionId });
  }

  setVerboseLogging(enabled: boolean): void {
    this.verboseLogging = enabled;
  }

  getSnapshot(): DevToolsSnapshot {
    return {
      verboseLogging: this.verboseLogging,
      logDirectory: this.logDirectory,
      appLogPath: this.appLogPath,
      errorLogPath: this.errorLogPath,
      sessionLogPath: this.sessionLogPath,
      lastBundlePath: this.lastBundlePath,
      recentEntries: [...this.recentEntries],
      recentErrors: [...this.recentErrors],
      actionMetrics: [...this.actionMetrics.values()].sort((left, right) => left.name.localeCompare(right.name)),
      distilledDiagnostics: {
        summary: [],
        failures: [],
        provider: [],
        mcp: [],
        performance: [],
      },
    };
  }

  buildDistilledDiagnostics(input: {
    providerMode: ProviderMode;
    providerStatus: ProviderStatus;
    mcp: McpHostSnapshot;
  }): DistilledDiagnostics {
    return distillDiagnostics({
      recentEntries: this.recentEntries,
      recentErrors: this.recentErrors,
      actionMetrics: [...this.actionMetrics.values()],
      providerMode: input.providerMode,
      providerStatus: input.providerStatus,
      mcp: input.mcp,
    });
  }

  async log(level: DevLogLevel, category: string, message: string, context: Record<string, unknown> = {}): Promise<DevLogEntry> {
    if (level === 'debug' && !this.verboseLogging) {
      return {
        id: makeId('log'),
        timestamp: now(),
        level,
        category,
        message,
        context,
      };
    }

    const entry: DevLogEntry = {
      id: makeId('log'),
      timestamp: now(),
      level,
      category,
      message,
      context,
    };

    this.recentEntries.unshift(entry);
    if (this.recentEntries.length > 250) {
      this.recentEntries.length = 250;
    }

    if (level === 'error') {
      this.recentErrors.unshift(entry);
      if (this.recentErrors.length > 100) {
        this.recentErrors.length = 100;
      }
    }

    await appendFile(this.appLogPath, formatLogLine(entry), 'utf8');
    await appendFile(this.sessionLogPath, `${safeJson(entry)}\n`, 'utf8');

    if (level === 'error') {
      await appendFile(this.errorLogPath, formatLogLine(entry), 'utf8');
    }

    return entry;
  }

  async logError(category: string, error: unknown, context: Record<string, unknown> = {}): Promise<void> {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack ?? null : null;
    await this.log('error', category, message, { ...context, stack });
  }

  async recordActionMetric(
    name: string,
    status: 'success' | 'failure',
    durationMs: number,
    context: Record<string, unknown> = {},
  ): Promise<void> {
    const existing = this.actionMetrics.get(name);
    const successCount = (existing?.successCount ?? 0) + (status === 'success' ? 1 : 0);
    const failureCount = (existing?.failureCount ?? 0) + (status === 'failure' ? 1 : 0);
    const priorRuns = (existing?.successCount ?? 0) + (existing?.failureCount ?? 0);
    const averageDurationMs = priorRuns === 0
      ? durationMs
      : Math.round((((existing?.averageDurationMs ?? durationMs) * priorRuns) + durationMs) / (priorRuns + 1));

    const metric: ActionMetric = {
      name,
      successCount,
      failureCount,
      lastDurationMs: durationMs,
      averageDurationMs,
      lastRunAt: now(),
      lastStatus: status,
    };

    this.actionMetrics.set(name, metric);
    await this.log(status === 'success' ? 'info' : 'warn', 'action', `${name} ${status}`, {
      ...context,
      durationMs,
      successCount,
      failureCount,
      averageDurationMs,
    });
  }

  async traceAction<T>(
    name: string,
    context: Record<string, unknown>,
    action: () => Promise<T>,
  ): Promise<T> {
    const startedAt = Date.now();
    const actionId = makeId('action');
    await this.log('debug', 'action', `${name} started`, { actionId, ...context });

    try {
      const result = await action();
      await this.recordActionMetric(name, 'success', Date.now() - startedAt, { actionId, ...context });
      return result;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      await this.recordActionMetric(name, 'failure', durationMs, { actionId, ...context });
      await this.logError('action', error, { actionId, action: name, durationMs, ...context });
      throw error;
    }
  }

  async exportDebugBundle(bundleName: string, data: Record<string, unknown>): Promise<string> {
    const target = join(this.bundlesDirectory, `${bundleName}-${Date.now()}`);
    await mkdir(target, { recursive: true });

    const snapshot = this.getSnapshot();
    await writeFile(join(target, 'devtools-snapshot.json'), JSON.stringify(snapshot, null, 2), 'utf8');
    await writeFile(join(target, 'app-state.json'), JSON.stringify(data, null, 2), 'utf8');

    const [appLog, errorLog] = await Promise.all([
      this.readIfExists(this.appLogPath),
      this.readIfExists(this.errorLogPath),
    ]);

    await writeFile(join(target, 'app.log'), appLog, 'utf8');
    await writeFile(join(target, 'error.log'), errorLog, 'utf8');

    this.lastBundlePath = target;
    await this.log('info', 'devtools', 'Exported debug bundle.', { target });
    return target;
  }

  async logProviderEvent(type: string, context: Record<string, unknown>): Promise<void> {
    const level: DevLogLevel = type.includes('failed') || type.includes('fallback') ? 'warn' : 'debug';
    await this.log(level, 'provider', type, context);
  }

  private async readIfExists(path: string): Promise<string> {
    try {
      return await readFile(path, 'utf8');
    } catch {
      return '';
    }
  }
}
