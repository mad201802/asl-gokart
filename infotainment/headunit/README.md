# headunit


## Install

```
npm install
```

## Run

```
npm run start
```

## Make Pi4 image

```
npm run make:pi4
```

Output: `./out/headunit_X.X.X_arm64`

## WebSocket logic

The backend (`ws-server.ts`) waits for new WS clients to connect and send a first `RegisterPacket` to declare which zone they belong to. It saves these tuples in a `Map<Zone, ZoneController>`.

After a WS client has registered itself in the backend, it can send "normal" `IncomingPacket`s containing data.

### Register a new zone controller as WebSocket client

1. Connect to the WebSocket server at `ws://localhost:6969`
2. Send a JSON body containing the `RegisterPacket`
```json
{
    "zone": "throttle"
}
```

### Send data from a `ZoneController` to an `ipcRenderer` listener

**Example**: Sending `getThrottle` to `window.websocket.onThrottleMessage`:

1. Register successfully (See above)
2. Send a JSON body containing the `IncomingPacket`
```json
{
    "zone": "throttle
    "command": "getThrootle",
    "value": 0.25
}
```

### Send data from `ipcRenderer` (a browser window) to a `ZoneController`

**Example**: Sending the command `getHealth` to the `BatteryController`:

1. Register the `BatteryController` successfully (See above)
2. Call the `window.websocket.send()` function like this
```ts
function() {
    const newPacket: OutgoingPacket = {
        zone: Zones.BATTERY,
        command: BatteryCommands.GET_HEALTH,
    };
    window.websocket.send(newPacket, Zones.BATTERY);
    }
```
