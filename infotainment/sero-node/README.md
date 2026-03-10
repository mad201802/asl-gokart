# sero-node

Node.js native bindings for the [sero](../sero) C++17 header-only protocol library. Exposes the full `sero::Runtime` API — service discovery, request/response, event pub/sub, HMAC authentication, and diagnostics — over an embedded POSIX UDP transport (unicast + multicast).

## Prerequisites

- Node.js ≥ 18 (or Bun)
- `node-gyp` build toolchain (Python 3, C++17 compiler)
- The `sero` library checked out at `../sero` (sibling directory)

## Install & build

```bash
bun install    # or npm install
bun run build  # or npm run build
```

For Electron:

```bash
bun run electron-rebuild
```

## Quick start

```ts
import { SeroRuntime, ReturnCode, DtcSeverity } from "./index";

// ── Create a runtime (binds UDP on port 30491) ──────────────
const rt = new SeroRuntime({ port: 30491, clientId: 0x7701 });

// ── Provider: register & offer a service ────────────────────
rt.registerService(0x1000, {
  onRequest(methodId, payload) {
    if (methodId === 0x0001) {
      return { returnCode: ReturnCode.E_OK, response: Buffer.from("pong") };
    }
    return { returnCode: ReturnCode.E_UNKNOWN_METHOD };
  },
});
rt.offerService(0x1000, 30);

// ── Consumer: discover & call a remote service ──────────────
rt.onServiceFound((serviceId, address) => {
  console.log(`Found 0x${serviceId.toString(16)} at ${address.ip}:${address.port}`);
});
rt.findService(0x0001); // e.g. ZC_LIGHTS_ID from ESP32

// Send a request (returns a Promise resolved during a future process() call)
const result = await rt.request(0x0001, 0x0002, Buffer.from([0x01]), 2000);
console.log("Response:", result.returnCode, result.payload);

// ── Event subscription (consumer) ───────────────────────────
rt.subscribeEvent(0x1000, 0x8001, (sid, eid, payload) => {
  console.log("Event:", sid, eid, payload);
});

// ── Event notification (provider) ───────────────────────────
rt.registerEvent(0x1000, 0x8001);
rt.notifyEvent(0x1000, 0x8001, Buffer.from([0x42]));

// ── Drive the protocol at ~100 Hz ───────────────────────────
setInterval(() => rt.process(), 10);

// ── Cleanup ─────────────────────────────────────────────────
// rt.destroy();
```

## API overview

### `new SeroRuntime(options)`

| Option     | Type     | Default     | Description                          |
| ---------- | -------- | ----------- | ------------------------------------ |
| `bindIp`   | `string` | `"0.0.0.0"` | IPv4 address to bind                |
| `port`     | `number` | —           | UDP port for unicast traffic         |
| `clientId` | `number` | —           | Unique client identifier (uint16)    |

### Lifecycle

| Method          | Description                                    |
| --------------- | ---------------------------------------------- |
| `process()`     | Drive one protocol cycle (poll, dispatch, SD)  |
| `destroy()`     | Release all resources                          |

### Provider

| Method                                              | Description                                  |
| --------------------------------------------------- | -------------------------------------------- |
| `registerService(id, handler, opts?)`               | Register a service implementation            |
| `unregisterService(id)`                             | Unregister a service                         |
| `offerService(id, ttl?)`                            | Announce via Service Discovery               |
| `stopOffer(id)`                                     | Stop announcing                              |
| `registerEvent(serviceId, eventId)`                 | Register a producible event                  |
| `notifyEvent(serviceId, eventId, payload)`          | Push notification to subscribers             |

### Consumer

| Method                                                                 | Description                           |
| ---------------------------------------------------------------------- | ------------------------------------- |
| `findService(id, major?)`                                              | Search via SD                         |
| `request(serviceId, methodId, payload?, timeout?) → Promise`          | Send request, await response          |
| `requestTo(addr, serviceId, methodId, payload?, timeout?) → Promise`  | Request to explicit address           |
| `fireAndForget(serviceId, methodId, payload?)`                         | One-way request                       |
| `subscribeEvent(serviceId, eventId, handler, ttl?)`                    | Subscribe to remote event             |
| `unsubscribeEvent(serviceId, eventId)`                                 | Unsubscribe                           |

### SD callbacks

| Method                  | Callback signature                                              |
| ----------------------- | --------------------------------------------------------------- |
| `onServiceFound(cb)`    | `(serviceId: number, address: Address) => void`                 |
| `onServiceLost(cb)`     | `(serviceId: number) => void`                                   |
| `onSubscriptionAck(cb)` | `(serviceId, eventId, returnCode, grantedTtl) => void`          |

### Security

| Method                        | Description                          |
| ----------------------------- | ------------------------------------ |
| `setHmacKey(peer, key)`       | Set 32-byte HMAC key for a peer      |

### Diagnostics & DTCs

| Method                         | Description                                |
| ------------------------------ | ------------------------------------------ |
| `onDiagnostic(cb)`             | Callback on counter increment              |
| `getDiagnostics()`             | Snapshot of all counters                   |
| `enableDiagnostics(auth?)`     | Enable built-in diagnostics service        |
| `reportDtc(code, severity)`    | Report a trouble code                      |
| `clearDtc(code)`               | Clear one DTC                              |
| `clearAllDtcs()`               | Clear all DTCs                             |
| `getDtcs()`                    | Read all active DTCs                       |

### Constants

Exported as frozen objects: `ReturnCode`, `DtcSeverity`, `DiagnosticCounter`, `MessageType`.

## Compatibility with ESP32 devices

This module uses the same wire format and multicast group (`239.0.0.1:30490`) as the ESP32 PlatformIO projects (`zc_buttons`, `zc_lights`). A desktop Node.js app using sero-node can discover, call methods on, and receive events from ESP32 devices on the same network — no configuration needed.
