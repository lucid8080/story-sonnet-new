---
title: MQTT Documentation
---

Here is a list of the MQTT topics and commands that you can use to interact with Yoto players.

## MQTT Command Topics

### `/device/{id}/command/events/request`

**Direction**: Client → Device

**Description**: Triggers the device to publish a current events report to `/device/{id}/data/events`.

---

### `/device/{id}/command/status/request`

**Direction**: Client → Device

**Description**: Triggers the device to publish a current status report to `/device/{id}/data/status`.

---

### `/device/{id}/command/volume/set`

**Direction**: Client → Device

**Description**: Sets the player's volume level.

**Payload**:

```json
{
  "volume": <integer>
}
```

**Field Details**:

- `volume`: Level to set [0 - 100]

---

### `/device/{id}/command/ambients/set`

**Direction**: Client → Device

**Description**: Sets the RGB tone for the player’s ambient LEDs.

**Payload**:

```json
{
  "r": <integer>,
  "g": <integer>,
  "b": <integer>
}
```

**Field Details**:

- `r`: Red intensity [0 - 255]
- `g`: Green intensity [0 - 255]
- `b`: Blue intensity [0 - 255]

---

### `/device/{id}/command/sleep-timer/set`

**Direction**: Client → Device

**Description**: Starts or restarts the sleep timer.

**Payload**:

```json
{
  "seconds": <integer>
}
```

**Field Details**:

- `seconds`: Number of seconds for the sleep timer. `0` disables the timer.

---

### `/device/{id}/command/reboot`

**Direction**: Client → Device

**Description**: Triggers a system reboot.

---

### `/device/{id}/command/card/start`

**Direction**: Client → Device

**Description**: Starts playback of a card with optional targeting of chapters, tracks, offsets, and playback controls.

**Payload**:

```json
{
  "uri":           "<string>",
  "chapterKey":    "<string>",   // optional
  "trackKey":      "<string>",   // optional
  "secondsIn":     <integer>,  // optional
  "cutOff":        <integer>,  // optional
  "anyButtonStop": <boolean>,  // optional
}
```

**Field Details**:

- `uri`: Card URI (e.g., `https://yoto.io/<cardID>`)
- `chapterKey`: Chapter to start playback from
- `trackKey`: Track to start playback from
- `secondsIn`: Playback start offset (in seconds)
- `cutOff`: Playback stop offset (in seconds)
- `anyButtonStop`: Whether button press stops playback

---

### `/device/{id}/command/card/stop`

**Direction**: Client → Device

**Description**: Stops playback of a card.

### `/device/{id}/command/card/pause`

**Direction**: Client → Device

**Description**: Pauses playback of a card.

### `/device/{id}/command/card/resume`

**Direction**: Client → Device

**Description**: Resumes playback of a card.

---

### `/device/{id}/command/bluetooth/on`

**Direction**: Client → Device

**Description**: Turns Bluetooth on in a specified mode with optional filters.

**Warning**: Entering Bluetooth sink mode (`mode: false`) disables MQTT command handling entirely until the user physically holds the left button for approximately 3 seconds to exit the mode. There is no way to detect this state or recover from it programmatically, so callers will receive no response after entering this mode.

**Payload**:

```json
{
  "action": "<string>",   // optional
  "mode":   <boolean>,   // optional
  "rssi":   <integer>,  // optional
  "name":   "<string>",   // optional
  "mac":    "<string>"    // optional
}
```

**Field Details**:

- `action`: `"on"`
- `mode`: `"true"` (BT audio source) BT sink is not triggered by setting the mode to false to trigger bt sink/speaker mode set mode to "bt_speaker" and do not set action mode only /bluetooth/on {"mode":"bt_speaker"}
- `rssi`: RSSI threshold for auto-connect
- `name`: Target Bluetooth device name
- `mac`: Target Bluetooth MAC (preferred over name)

---

### `/device/{id}/command/bluetooth/off`

**Direction**: Client → Device

**Description**: Turns Bluetooth off.

---

### `/device/{id}/command/bluetooth/delete-bonds`

**Direction**: Client → Device

**Description**: Deletes all previously bonded Bluetooth devices.

---

### `/device/{id}/command/bluetooth/connect`

**Direction**: Client → Device

**Description**: Connects to a previously bonded Bluetooth device.

---

### `/device/{id}/command/bluetooth/disconnect`

**Direction**: Client → Device

**Description**: Disconnects the current active Bluetooth connection.

---

### `/device/{id}/command/bluetooth/state`

**Direction**: Client → Device

**Description**: Checks if the Bluetooth driver is initialized and running.

---

### `/device/{id}/command/display/preview`

**Direction**: Client → Device

**Description**: Previews an icon on the player display.

**Payload**:

```json
{
  "uri":      "<string>",
  "timeout":  <integer>,
  "animated": <integer>
}
```

**Field Details**:

- `uri`: Filepath to the icon asset
- `timeout`: Display duration in seconds
- `animated`: Whether the icon is animated (`1`) or static (`0`)

---

## MQTT Data Topics

### `/device/{id}/data/events`

**Direction**: Device → Client

**Description**: Provides real-time playback and interaction event data.
**Payload**:

```json
{
  "repeatAll": "<string>", // "true" or "false"
  "streaming": "<string>", // "true" or "false"
  "volume": "<string>",
  "volumeMax": "<string>",
  "playbackWait": "<string>", // "true" or "false"
  "sleepTimerActive": "<string>", // "true" or "false"
  "eventUtc": "<string>", // Unix timestamp
  "trackLength": "<string>", // Track duration in seconds
  "position": "<string>", // Current position in seconds
  "cardId": "<string>",
  "source": "<string>", // e.g. "card", "remote", "MQTT"
  "cardUpdatedAt": "<string>", // ISO8601 format timestamp
  "chapterTitle": "<string>",
  "chapterKey": "<string>",
  "trackTitle": "<string>",
  "trackKey": "<string>",
  "playbackStatus": "<string>", // e.g. "playing", "paused", "stopped"
  "sleepTimerSeconds": "<string>" // Seconds remaining on the sleep timer
}
```

---

### `/device/{id}/data/status`

**Direction**: Device → Client

**Description**: Provides device status information, environment details, and configuration state.

**Payload**:

```json
{
  "statusVersion": <integer>,
  "fwVersion": "<string>",
  "productType": "<string>",
  "batteryLevel": <integer>,
  "als": <integer>,
  "freeDisk": <integer>,
  "shutdownTimeout": <integer>,
  "dbatTimeout": <integer>,
  "charging": <integer>,
  "activeCard": "<string>",
  "cardInserted": <integer>,
  "playingStatus": <integer>,
  "headphones": <boolean>,
  "dnowBrightness": <integer>,
  "dayBright": <integer>,
  "nightBright": <integer>,
  "bluetoothHp": <boolean>,
  "volume": <integer>,
  "userVolume": <integer>,
  "timeFormat": "12" | "24",
  "nightlightMode": "<string>",
  "temp": "<string>",
  "day": <integer>
}
```

---

## Response Topic

### `/device/{id}/response`

**Direction**: Device → Client

**Description**: Used by the device to confirm the result of a command. The response dynamically names the field after the command’s resource.

**Payload**:

```json
{
  "status": {
    "<resource>": "OK" | "FAIL",
    "req_body": "{\"requestId\":\"<string>\"}"
  }
}
```

**Notes**:

- Applies to all topics under `/command/{resource}/{action}`
- `<resource>` corresponds to the resource part of the command topic (e.g., `status`, `events`, `volume`)
- The result (`"OK"` or `"FAIL"`) reflects whether the command was successfully handled
- `req_body` is a **stringified JSON** from the original request, typically including `"requestId"`