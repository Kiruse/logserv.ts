import { defaultMarshaller } from '@kiruse/marshal';
import fs from 'fs/promises';
import * as http from 'http';
import * as https from 'https';
import { Server, Socket as SocketBase } from 'socket.io';
import * as YAML from 'yaml';
import { ClientEvents, LogSeverity, ServerEvents } from './types.js';
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
    this.#socket.use(async (socket, next) => {
      try {
        if (!socket.handshake.auth.channel || !await this.isAuthorized(socket)) {
          this.#log('logserv', LogSeverity.Trace, new Date(), `Client ${getSocketId(socket)} unauthorized`);
          next(new Error('Unauthorized'));
        }
      } catch (err) {
        this.#log('logserv', LogSeverity.Error, new Date(), `Error during authentication of client ${getSocketId(socket)}:`, err);
        next(new Error('Internal server error'));
      }
    });
    this.#socket.on('connection', this.#onConnect);
  }

  /** Callback to check whether a client is authorized to access this server. Default implementation
   * always returns true. See https://socket.io/docs/v4/client-options/#auth for more information.
   */
  isAuthorized(socket: Socket): boolean | Promise<boolean> {
    return true;
  }

  #onConnect = (socket: Socket) => {
    const { channel } = socket.handshake.auth;
    this.#log('logserv', LogSeverity.Info, new Date(), `Client ${getSocketId(socket)} connected`);

    socket.on('disconnect', () => {
      this.#log('logserv', LogSeverity.Info, new Date(), `Client ${getSocketId(socket)} disconnected`);
    });
    socket.on('log', (severity: number, timestamp: string, ...messages: any[]) => {
      this.#log(channel, severity, new Date(timestamp), ...messages);
    });
    socket.on('sub', (channel: string) => {
      console.info(`Client ${getSocketId(socket)} subscribed to logs/${channel}`);
      socket.join(`logs/${channel}`);
    });
    socket.on('unsub', (channel: string) => {
      console.info(`Client ${getSocketId(socket)} unsubscribed from logs/${channel}`);
      socket.leave(`logs/${channel}`);
    });
  }

  #log = (channel: string, severity: number, timestamp: Date, ...messages: any[]) => {
    console.log(getLogPrefix(severity, channel, timestamp), ...messages);
    this.#socket.to(`logs/${channel}`).emit('push', channel, severity, timestamp.toISOString(), ...messages);
    this.#socket.to(`logs/*`).emit('push', channel, severity, timestamp.toISOString(), ...messages);
    this.#logToFile(channel, severity, timestamp, ...messages);
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
        console.log(`LogServer listening on port ${port}`);
      });
    });
    return new LogServer(server);
  }
}

var warnedMissingLogFolder = false;

function getSocketId(socket: Socket) {
  const { channel } = socket.handshake.auth;
  return channel
    ? `${channel}/${socket.id}`
    : socket.id;
}
