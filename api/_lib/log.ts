/**
 * Minimal structured logger for serverless functions. One JSON line per event keeps
 * Vercel logs searchable (e.g. `vercel logs --query coach.failure`) and never includes
 * request bodies, keys or personal data — only an event name and a short detail.
 */
type Level = 'info' | 'warn' | 'error';

export interface LogEntry {
  level: Level;
  event: string;
  detail?: string;
}

/** Short, safe description of any thrown value or detail. */
const describe = (detail: unknown): string => {
  if (detail instanceof Error) return detail.message;
  if (typeof detail === 'string') return detail;
  try {
    return JSON.stringify(detail);
  } catch {
    return 'unserialisable detail';
  }
};

export function log(level: Level, event: string, detail?: unknown): LogEntry {
  const entry: LogEntry = {
    level,
    event,
    ...(detail === undefined ? {} : { detail: describe(detail) }),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
  return entry;
}
