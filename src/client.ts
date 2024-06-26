import { Socket as SocketBase, type SocketOptions, io } from 'socket.io-client';
import { ClientEvents, LogSeverity, ServerEvents } from './types.js';
import { DEFAULT_LOGSERVER_PORT, getClientLogPrefix, getServerLogPrefix } from './util.js';

export type Socket = SocketBase<ServerEvents, ClientEvents>;

export class LogClient {
  #socket: Socket | undefined;
  #channels = new Set<string>();
  #syncListeners: (() => void)[] = [];

  constructor(public readonly channel: string, socket: Socket | undefined) {
    this.#socket = socket;
    this.#socket?.on('connect', this.#onConnect);
    this.#socket?.on('push', (channel, severity, timestamp, ...messages) => {
      console.log(getServerLogPrefix(severity, channel, new Date(timestamp)), ...messages);
    });
  }

  #onConnect = () => {
    this.#syncListeners.forEach(listener => listener());
    this.#channels.forEach(ch => this.#socket?.emit('sub', ch));
  }

  #log = (severity: LogSeverity, ...messages: any[]) => {
    console.log(getClientLogPrefix(severity), ...messages);
    this.#socket?.emit('log', severity, new Date().toISOString(), ...messages);
  }

  trace = (...messages: any[]) => this.#log(LogSeverity.Trace, ...messages);
  debug = (...messages: any[]) => this.#log(LogSeverity.Debug, ...messages);
  info  = (...messages: any[]) => this.#log(LogSeverity.Info,  ...messages);
  warn  = (...messages: any[]) => this.#log(LogSeverity.Warn,  ...messages);
  error = (...messages: any[]) => this.#log(LogSeverity.Error, ...messages);

  listen(channel = '*') {
    if (!this.#socket) throw Error('Cannot listen without a socket');
    if (this.#socket.connected)
      this.#socket.emit('sub', channel);
    this.#channels.add(channel);
  }

  sync() {
    if (!this.#socket) throw Error('Cannot sync without a socket');
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
      switch (err.message) {
        case 'timeout':
          console.error(getClientLogPrefix(LogSeverity.Error), 'Connection to log server timed out');
          return;
        case 'xhr poll error':
          console.error(getClientLogPrefix(LogSeverity.Error), 'Failed to connect to log server (XHR Poll Error)');
          return;
        default:
          console.error(getClientLogPrefix(LogSeverity.Error), 'Failed to connect to log server:', err);
      }
    });
    return new LogClient(channel, socket);
  }
}
