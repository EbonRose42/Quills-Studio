export function formatArtifactBody(text?: string, data?: unknown): string {
  if (text) {
    return text;
  }

  return JSON.stringify(data, null, 2);
}

export const theme = {
  background: '#efe7d7',
  panel: '#f7f1e4',
  panelStrong: '#eadfca',
  text: '#2f2419',
  accent: '#8c3d23',
  accentSoft: '#d9b79f',
  border: '#c7b89d',
};
