import { Socket as SocketBase, type SocketOptions, io } from 'socket.io-client';
import { ClientEvents, LogSeverity, ServerEvents } from './types.js';
import { DEFAULT_LOGSERVER_PORT, SeverityTags, getTimestamp } from './util.js';
import chalk from 'chalk';

export type Socket = SocketBase<ServerEvents, ClientEvents>;

export class LogClient {
  #socket: Socket;
  #channels = new Set<string>();
  #syncListeners: (() => void)[] = [];

  constructor(public readonly channel: string, socket: Socket) {
    this.#socket = socket;
    this.#socket.on('connect', this.#onConnect);
    this.#socket.on('push', (channel, severity, timestamp, ...messages) => {
      console.log(getLogPrefix(severity, channel, new Date(timestamp)), ...messages);
    });
  }

  #onConnect = () => {
    this.#syncListeners.forEach(listener => listener());
    this.#channels.forEach(ch => this.#socket.emit('sub', ch));
  }

  #log = (severity: LogSeverity, ...messages: any[]) => {
    console.log(getLogPrefix(severity), ...messages);
    this.#socket.emit('log', severity, new Date().toISOString(), ...messages);
  }

  trace = (...messages: any[]) => this.#log(LogSeverity.Trace, ...messages);
  debug = (...messages: any[]) => this.#log(LogSeverity.Debug, ...messages);
  info  = (...messages: any[]) => this.#log(LogSeverity.Info,  ...messages);
  warn  = (...messages: any[]) => this.#log(LogSeverity.Warn,  ...messages);
  error = (...messages: any[]) => this.#log(LogSeverity.Error, ...messages);

  listen(channel = '*') {
    if (this.#socket.connected)
      this.#socket.emit('sub', channel);
    this.#channels.add(channel);
  }

  sync() {
    if (this.#socket.connected) return Promise.resolve();
    return new Promise<void>(resolve => {
      this.#syncListeners.push(resolve);
    });
  }

  static connect(channel: string, url: string, opts?: SocketOptions): LogClient;
  static connect(channel: string, opts: SocketOptions): LogClient;
  static connect(channel: string, ...args: any[]) {
    let socket: Socket;
    if (typeof args[0] === 'string') {
      const [url, opts] = args;
      socket = io(url, { ...opts, auth: { channel, ...opts?.auth } });
    } else {
      const [opts] = args;
      socket = io({ port: DEFAULT_LOGSERVER_PORT, ...opts, auth: { channel, ...opts?.auth } });
    }
    socket.on('connect_error', (err) => {
      console.error('Failed to connect to log server:', err);
    });
    return new LogClient(channel, socket);
  }
}

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

export const SeverityColors: Record<LogSeverity, string> = {
  [LogSeverity.Trace]: '#6A04E8',
  [LogSeverity.Debug]: '#6A04E8',
  [LogSeverity.Info]: '#FFFFFF',
  [LogSeverity.Warn]: '#FFD000',
  [LogSeverity.Error]: '#FF0000',
};
