type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogMeta {
  [key: string]: unknown;
}

function format(level: LogLevel, message: string, meta?: LogMeta): string {
  const timestamp = new Date().toISOString();
  const base = { ts: timestamp, level, message };
  const payload = meta ? { ...base, ...meta } : base;
  return JSON.stringify(payload);
}

export const logger = {
  info(message: string, meta?: LogMeta) {
    console.log(format('info', message, meta));
  },
  warn(message: string, meta?: LogMeta) {
    console.warn(format('warn', message, meta));
  },
  error(message: string, meta?: LogMeta) {
    console.error(format('error', message, meta));
  },
  debug(message: string, meta?: LogMeta) {
    if (process.env.DEBUG?.toLowerCase() === 'true') {
      console.debug(format('debug', message, meta));
    }
  },
};
