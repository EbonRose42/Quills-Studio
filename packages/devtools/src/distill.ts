import type { ActionMetric, DevLogEntry } from './service';
import type { ProviderMode, ProviderStatus } from '@quills/shared';
import type { McpHostSnapshot } from '@quills/mcp';

const ANSI_PATTERN = /\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

export interface DistilledDiagnostics {
  summary: string[];
  failures: string[];
  provider: string[];
  mcp: string[];
  performance: string[];
}

function normalizeForModel(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(ANSI_PATTERN, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function structuralSignature(input: string): string[] {
  return normalizeForModel(input)
    .split('\n')
    .map((line) =>
      line
        .toLowerCase()
        .replace(/\b\d+\b/g, '#')
        .replace(/[0-9a-f]{7,}/g, '<hex>')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .slice(0, 24);
}

function structuralSimilarity(a: string, b: string): number {
  const left = structuralSignature(a);
  const right = structuralSignature(b);
  if (left.length === 0 || right.length === 0) return 0;
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  let overlap = 0;
  for (const value of leftSet) {
    if (rightSet.has(value)) overlap += 1;
  }
  return (2 * overlap) / (leftSet.size + rightSet.size);
}

function dedupeLines(lines: string[]): string[] {
  const result: string[] = [];
  for (const line of lines) {
    if (result.length === 0) {
      result.push(line);
      continue;
    }
    const previous = result[result.length - 1]!;
    if (structuralSimilarity(previous, line) < 0.9) {
      result.push(line);
    }
  }
  return result;
}

export function distillDiagnostics(input: {
  recentEntries: DevLogEntry[];
  recentErrors: DevLogEntry[];
  actionMetrics: ActionMetric[];
  providerMode: ProviderMode;
  providerStatus: ProviderStatus;
  mcp: McpHostSnapshot;
}): DistilledDiagnostics {
  const failures = dedupeLines(
    input.recentErrors.slice(0, 8).map((entry) => `${entry.category}: ${normalizeForModel(entry.message)}`),
  );

  const provider = [
    `Provider mode: ${input.providerMode}.`,
    input.providerStatus.available
      ? `${input.providerStatus.displayName} reachable at ${input.providerStatus.baseUrl}.`
      : `${input.providerStatus.displayName} unavailable: ${input.providerStatus.lastError ?? 'unknown error'}.`,
    input.providerStatus.missingModels.length > 0
      ? `Missing models: ${input.providerStatus.missingModels.join(', ')}.`
      : 'Required models available.',
  ];

  const mcp = input.mcp.recentActivity.length > 0
    ? dedupeLines(
        input.mcp.recentActivity.slice(0, 10).map((entry) => `${entry.serverId} ${entry.operation} ${entry.name}: ${entry.status}`),
      )
    : ['No MCP activity recorded.'];

  const slowMetrics = input.actionMetrics
    .filter((metric) => metric.averageDurationMs >= 500)
    .sort((left, right) => right.averageDurationMs - left.averageDurationMs)
    .slice(0, 6)
    .map((metric) => `${metric.name}: avg ${metric.averageDurationMs}ms, last ${metric.lastDurationMs}ms, ${metric.lastStatus}.`);

  const summary = dedupeLines([
    failures.length > 0 ? `${failures.length} recent error pattern(s) captured.` : 'No recent error patterns captured.',
    input.providerStatus.available ? 'Provider path is live.' : 'Provider path is degraded.',
    input.mcp.lastContextPack ? `Latest MCP context pack targets ${input.mcp.lastContextPack.targetId}.` : 'No MCP context pack has been built yet.',
    slowMetrics.length > 0 ? `${slowMetrics.length} action(s) are materially slow.` : 'No materially slow actions detected.',
  ]);

  return {
    summary,
    failures,
    provider,
    mcp,
    performance: slowMetrics.length > 0 ? slowMetrics : ['No slow action metrics detected.'],
  };
}
