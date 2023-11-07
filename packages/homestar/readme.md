# Package 1 [![NPM Version](https://img.shields.io/npm/v/iso-base.svg)](https://www.npmjs.com/package/iso-base) [![License](https://img.shields.io/npm/l/iso-base.svg)](https://github.com/hugomrdias/iso-repo/blob/main/license) [![iso-base](https://github.com/hugomrdias/iso-repo/actions/workflows/iso-base.yml/badge.svg)](https://github.com/hugomrdias/iso-repo/actions/workflows/iso-base.yml)

## Installation

```bash
pnpm install package1
```

## Usage

```js
import { module } from 'package1'
```

## TODO

- CID in the `run` prop dag-cbor CID v1 (sha3-256)
- count workflow tasks and match receipts then unsub with unsubscribe_run_workflow and client events
-

```rust
/// Health endpoint.
pub(crate) const HEALTH_ENDPOINT: &str = "health";
/// Metrics endpoint for prometheus / openmetrics polling.
pub(crate) const METRICS_ENDPOINT: &str = "metrics";
/// Run a workflow and subscribe to that workflow's events.
#[cfg(feature = "websocket-notify")]
pub(crate) const SUBSCRIBE_RUN_WORKFLOW_ENDPOINT: &str = "subscribe_run_workflow";
/// Unsubscribe from a workflow's events.
#[cfg(feature = "websocket-notify")]
pub(crate) const UNSUBSCRIBE_RUN_WORKFLOW_ENDPOINT: &str = "unsubscribe_run_workflow";
/// Subscribe to network events.
#[cfg(feature = "websocket-notify")]
pub(crate) const SUBSCRIBE_NETWORK_EVENTS_ENDPOINT: &str = "subscribe_network_events";
/// Unsubscribe from network events.
#[cfg(feature = "websocket-notify")]
pub(crate) const UNSUBSCRIBE_NETWORK_EVENTS_ENDPOINT: &str = "unsubscribe_network_events";
```

## Contributing

Read contributing guidelines [here](../../.github/CONTRIBUTING.md).

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/hugomrdias/hd-template)

## License

[MIT](../../license) © [Hugo Dias](http://hugodias.me)
