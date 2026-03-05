/**
 * Renderer-side logger with level filtering.
 * 
 * Log level is controlled via the settings page and synced to the main
 * process (electron-log) through IPC.  On the renderer side we simply
 * gate console.* calls so the browser DevTools stay tidy.
 */

export type LogLevel = "error" | "warn" | "info" | "debug";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

let currentLevel: LogLevel = "info";

export function setRendererLogLevel(level: LogLevel) {
  currentLevel = level;
}

export function getRendererLogLevel(): LogLevel {
  return currentLevel;
}

const log = {
  error: (...args: unknown[]) => {
    if (LOG_LEVEL_PRIORITY[currentLevel] >= LOG_LEVEL_PRIORITY.error) {
      console.error(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (LOG_LEVEL_PRIORITY[currentLevel] >= LOG_LEVEL_PRIORITY.warn) {
      console.warn(...args);
    }
  },
  info: (...args: unknown[]) => {
    if (LOG_LEVEL_PRIORITY[currentLevel] >= LOG_LEVEL_PRIORITY.info) {
      console.log(...args);
    }
  },
  debug: (...args: unknown[]) => {
    if (LOG_LEVEL_PRIORITY[currentLevel] >= LOG_LEVEL_PRIORITY.debug) {
      console.debug(...args);
    }
  },
};

export default log;
