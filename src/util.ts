import chalk from 'chalk';
import { LogSeverity } from './types.js';

export const DEFAULT_LOGSERVER_PORT = 7031;

export function getTimestamp(timestamp = new Date()) {
  const date = `${timestamp.getFullYear() % 100}/${timestamp.getMonth() + 1}/${timestamp.getDate()}`;
  const time = `${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')}:${timestamp.getSeconds().toString().padStart(2, '0')}`;
  return `${date} ${time}`;
}

export const SeverityColors: Record<LogSeverity, string> = {
  [LogSeverity.Trace]: '#6A04E8',
  [LogSeverity.Debug]: '#6A04E8',
  [LogSeverity.Info]: '#FFFFFF',
  [LogSeverity.Warn]: '#FFD000',
  [LogSeverity.Error]: '#FF0000',
};

export const SeverityTags: Record<LogSeverity, string> = {
  [LogSeverity.Trace]: 'TRACE',
  [LogSeverity.Debug]: 'DEBUG',
  [LogSeverity.Info]: 'INFO',
  [LogSeverity.Warn]: 'WARN',
  [LogSeverity.Error]: 'ERROR',
};

export function getLogPrefix(severity: LogSeverity, extra = '', timestamp = new Date(), colorize = true) {
  const tag = SeverityTags[severity] ?? 'INFO';
  const text = extra
    ? `[${getTimestamp(timestamp)} ${extra}/${tag}]`
    : `[${getTimestamp(timestamp)} ${tag}]`;
  if (colorize) {
    const color = SeverityColors[severity] ?? '#FFFFFF';
    return chalk.hex(color)(text);
  } else {
    return text;
  }
}