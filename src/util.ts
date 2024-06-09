import chalk from 'chalk';
import { LogSeverity } from './types.js';

export const DEFAULT_LOGSERVER_PORT = 7031;

export function getTimestamp(timestamp = new Date()) {
  const date = `${timestamp.getFullYear() % 100}/${timestamp.getMonth() + 1}/${timestamp.getDate()}`;
  const time = `${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')}:${timestamp.getSeconds().toString().padStart(2, '0')}`;
  return `${date} ${time}`;
}

export const SeverityTags: Record<LogSeverity, string> = {
  [LogSeverity.Trace]: 'TRACE',
  [LogSeverity.Debug]: 'DEBUG',
  [LogSeverity.Info]: 'INFO',
  [LogSeverity.Warn]: 'WARN',
  [LogSeverity.Error]: 'ERROR',
};
