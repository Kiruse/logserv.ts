import { defaultMarshaller } from '@kiruse/marshal';
import fs from 'fs/promises';
import * as http from 'http';
import * as https from 'https';
import { Server, Socket as SocketBase } from 'socket.io';
import * as YAML from 'yaml';
import { ClientEvents, ServerEvents } from './types.js';
import { DEFAULT_LOGSERVER_PORT, getLogPrefix, getTimestamp } from './util.js';

export type Socket = SocketBase<ClientEvents, ServerEvents>;

export interface LogServerOptions {
  httpServer: http.Server | https.Server;
}

export class LogServer {
  #socket: Server;

  getTimestamp = getTimestamp;

  constructor(public readonly _httpServer: http.Server | https.Server, public marshal = defaultMarshaller.marshal) {
    this.#socket = new Server(_httpServer);
    this.#socket.on('connection', this.#onConnect);
  }

  /** Callback to check whether a client is authorized to access this server. Default implementation
   * always returns true. See https://socket.io/docs/v4/client-options/#auth for more information.
   */
  isAuthorized(socket: Socket) {
    return true;
  }

  #onConnect = (socket: Socket) => {
    if (!this.isAuthorized(socket)) return;

    socket.on('log', (channel: string, severity: number, timestamp: string, ...messages: any[]) => {
      const date = new Date(timestamp);
      console.log(getLogPrefix(severity, channel, date), ...messages);
      socket.to(`logs/${channel}`).emit('push', channel, severity, timestamp, ...messages);
      socket.to(`logs/*`).emit('push', channel, severity, timestamp, ...messages);
      this.#logToFile(channel, severity, date, ...messages);
    });
    socket.on('sub', (channel: string) => {
      console.info(`Client ${socket.id} subscribed to logs/${channel}`);
      socket.join(`logs/${channel}`);
    });
    socket.on('unsub', (channel: string) => {
      console.info(`Client ${socket.id} unsubscribed from logs/${channel}`);
      socket.leave(`logs/${channel}`);
    });
  }

  #logToFile = (channel: string, severity: number, timestamp: Date, ...messages: any[]) => {
    const prefix = getLogPrefix(severity, channel, timestamp, false);
    const parts = messages.map(msg => YAML.stringify(this.marshal(msg), { indent: 2 }));
    fs.appendFile(`/var/log/logserv.log`, `${prefix} ${parts.join('\n')}\n`)
      .catch(err => {
        if (warnedMissingLogFolder) return;
        warnedMissingLogFolder = true;
        console.warn('Failed to write to log file /var/log/logserv.log:', err);
      });
  }

  static async fromEnv() {
    const port = process.env.LOGSERVER_PORT ?? process.env.PORT ?? DEFAULT_LOGSERVER_PORT;
    const certPath = process.env.LOGSERVER_CERT_PATH;
    const keyPath  = process.env.LOGSERVER_KEY_PATH;
    const [cert, key] = await Promise.all([
      certPath ? fs.readFile(certPath) : Promise.resolve(undefined),
      keyPath  ? fs.readFile(keyPath)  : Promise.resolve(undefined),
    ]);
    const server = cert && key
      ? https.createServer({ cert, key })
      : http.createServer();
    await new Promise<void>((resolve, reject) => {
      const onError = (err: any) => {
        reject(err);
      }
      server.on('error', onError);
      server.listen(port, () => {
        resolve();
        server.off('error', onError);
      });
    });
    return new LogServer(server);
  }
}

var warnedMissingLogFolder = false;
