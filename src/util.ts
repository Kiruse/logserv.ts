import chalk from 'chalk';
import { LogSeverity } from './types.js';
import { sha256 } from '@noble/hashes/sha256';

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

export const SeverityColors: Record<LogSeverity, string> = {
  [LogSeverity.Trace]: '#6A04E8',
  [LogSeverity.Debug]: '#6A04E8',
  [LogSeverity.Info]: '#FFFFFF',
  [LogSeverity.Warn]: '#FFD000',
  [LogSeverity.Error]: '#FF0000',
};

export function getServerLogPrefix(severity: LogSeverity, extra = '', timestamp = new Date(), colorize = true) {
  const tag = SeverityTags[severity] ?? 'INFO';
  const text = extra
  ? `[${getTimestamp(timestamp)} ${extra}/${tag}]`
  : `[${getTimestamp(timestamp)} ${tag}]`;
  if (colorize) {
    const color = getClientColor(extra);
    return chalk.hex(color)(text);
  } else {
    return text;
  }
}

function getClientColor(client: string) {
  const bytes = sha256(client);
  const words = new Uint32Array(bytes.buffer);
  const sum = words.reduce((acc, word) => acc + word, 0);
  const rgb = sum % 0xFFFFFF;
  return '#' + rgb.toString(16).padStart(6, '0');
}

export function getClientLogPrefix(severity: LogSeverity, extra = '', timestamp = new Date(), colorize = true) {
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
