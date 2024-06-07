# @kiruse/logserv
Simple self-hosted logging server & client to provide rudimentary observability. For really basic needs. If you require more complex features, metrics, alerts, tracing, cloud management, etc. consider [Grafana](https://grafana.com/) or [Open Telemetry](https://opentelemetry.io/).

The goal of this simple server is to allow collecting logs from multiple sources & servers in one single location.

## Features
- [x] Logging ingress & egress
- [ ] REST endpoints for querying
- [ ] Configurable persistence (?)
- [ ] Log to `/var/log/logserv.log` to integrate with logrotate
- [x] Configure & observe specific `/var/log` files
- [x] Authentication hook

# Usage
*logserv* consists of 3 components:

- **LogServer**, which accepts and repeats logs
- **LogClient** as Producer, which sends logs on a specific channel
- **LogClient** as Consumer, which consumes logs on a specific channel or the wildcard channel

All of these components must be incorporated into your scripts, for example:

```typescript
// server
import { LogServer } from '@kiruse/logserv/server';
LogServer.fromEnv();
```

`LogServer.fromEnv()` does a few things:
- Loads port from `LOGSERVER_PORT` or `PORT`, or uses the default port of `7031`
- Loads TLS certificate & key from `LOGSERVER_CERT_PATH` and `LOGSERVER_KEY_PATH`, respectively
- Creates an https server if both are present, otherwise an http server, and
- Automatically & immediately starts listening.

If you need to deviate from these default configurations you can simply create a `new LogServer` which takes an http or https server.

```typescript
// producer
import { LogClient } from '@kiruse/logserv/client';
const logger = LogClient.connect('some-producer', 'ws://localhost:7031');
logger.info('Hello, world!');
```

This instantiates a socket.io connection and tries to connect to the server. `logger.info('Hello, world!')` will be logged to your local console as well as sent to the server (non-blocking) if the connection is available. The server will then forward it to all subscribed listeners. The server & consumers will also log the messages to their console.

```typescript
// consumer
import { LogClient } from '@kiruse/logserv/client';
const logger = LogClient.connect('consumer', 'ws://localhost:7031');
logger.listen('some-producer'); // OR
logger.listen('*');
```

This connects to the LogServer and subscribes to logs from `some-producer` or all logs. Note that currently, the client would receive `some-producer`'s logs doubly when subscribed to both the specific channel as well as the wildcard channel.

Obviously, the `LogClient` can be used for both sending logs & receiving logs, but typically you will likely only want to do one of both.

## Custom Client Socket
You may also create a `new LogClient(channel, socket)` with a socket.io socket you construct & provide yourself. When doing so, be sure to pass in the `channel` to the `auth` socket option. The server requires this to enforce clients may only send logs on their authorized channels. Without this property present on the handshake authentication payload, the server will always silently close the connection.

## Authentication
The `LogServer` currently supports a simple per-connection authentication hook. This method receives the socket.io `Socket`, meaning [socket.io authentication](https://socket.io/docs/v4/client-options/#auth) logic applies:

```typescript
// client
import { LogClient } from '@kiruse/logserv/client';
const logger = LogClient.connect('some-client', 'ws://localhost:7031', {
  auth: {
    token: 'foobar',
  },
});
```

```typescript
import { LogServer, Socket } from '@kiruse/logserv/server';
const server = LogServer.fromEnv();
server.isAuthorized = (socket: Socket) => {
  // do something with the token, e.g. look it up in a database or verify it as a JWT
  // the exact implementation is up to you
  socket.handshake.auth.token
};
```

# License
Licensed under Apache 2.0
