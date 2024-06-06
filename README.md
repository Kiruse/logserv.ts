# @kiruse/logserv
Simple self-hosted logging server & client to provide rudimentary observability. For really basic needs. If you require more complex features, metrics, alerts, tracing, cloud management, etc. consider [Grafana](https://grafana.com/) or [Open Telemetry](https://opentelemetry.io/).

The goal of this simple server is to allow collecting logs from multiple sources & servers in one single location.

## Features
- [x] Logging ingress & egress
- [ ] REST endpoints for querying
- [ ] Configurable persistence time frame
- [ ] Log to `/var/log/logserv.log` to integrate with logrotate
- [ ] Configure & observe specific `/var/log` files

# License
Licensed under Apache 2.0
