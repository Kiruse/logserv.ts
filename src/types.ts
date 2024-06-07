export enum LogSeverity {
  Trace,
  Debug,
  Info,
  Warn,
  Error,
}

/** Events triggered by the server. Servers listen to `ClientEvents`. */
export interface ServerEvents {
  push(channel: string, severity: LogSeverity, timestamp: string, ...messages: any[]): void;
}

/** Events triggered by the client. Clients listen to `ServerEvents`. */
export interface ClientEvents {
  log(severity: LogSeverity, timestamp: string, ...messages: any[]): void;
  sub(channel: string): void;
  unsub(channel: string): void;
}
