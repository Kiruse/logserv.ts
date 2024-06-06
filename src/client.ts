import { Socket as SocketBase, io } from 'socket.io-client';
import { ClientEvents, LogSeverity, ServerEvents } from './types.js';
import { DEFAULT_LOGSERVER_PORT, getLogPrefix } from './util.js';

export type Socket = SocketBase<ServerEvents, ClientEvents>;

export class LogClient {
  #socket: Socket;

  constructor(public readonly channel: string, socket: Socket) {
    this.#socket = socket;
    this.#socket.on('push', (channel, severity, timestamp, ...messages) => {
      console.log(getLogPrefix(severity, channel, new Date(timestamp)), ...messages);
    });
  }

  #log = (severity: LogSeverity, ...messages: any[]) => {
    console.log(getLogPrefix(severity), ...messages);
    this.#socket.emit('log', this.channel, severity, new Date().toISOString(), ...messages);
  }

  trace = (...messages: any[]) => this.#log(LogSeverity.Trace, ...messages);
  debug = (...messages: any[]) => this.#log(LogSeverity.Debug, ...messages);
  info  = (...messages: any[]) => this.#log(LogSeverity.Info,  ...messages);
  warn  = (...messages: any[]) => this.#log(LogSeverity.Warn,  ...messages);
  error = (...messages: any[]) => this.#log(LogSeverity.Error, ...messages);

  listen(channel = '*') {
    this.#socket.emit('sub', channel);
  }

  static connect(channel: string, host: string, port = DEFAULT_LOGSERVER_PORT) {
    const socket = io(`http://${host}:${port}`);
    socket.on('connect_error', (err) => {
      console.error('Failed to connect to log server:', err);
    });
    return new LogClient(channel, socket);
  }
}
