---
title: Connecting to players
---

Our API lets you connect to your Yoto devices, perform specific actions on them, and receive updates on their state.

This happens via the MQTT protocol. Here's how it works:

## Step 1: Connect to the MQTT broker

The MQTT broker is available at `wss://aqrphjqbp3u2z-ats.iot.eu-west-2.amazonaws.com`. You'll need to authenticate using a JWT token.

First, set up the authorizer name:

Here's how to connect:

```javascript
const clientId = `DASH${deviceId}`;

mqttClient = mqtt.connect(MQTT_URL, {
  keepalive: 300,
  port: 443,
  protocol: "wss",
  username: `${deviceId}?x-amz-customauthorizer-name=PublicJWTAuthorizer`,
  password: accessToken,
  reconnectPeriod: 0,
  clientId,
  ALPNProtocols: ["x-amzn-mqtt-ca"],
});
```

## Step 2: Get your devices

First, fetch your devices from our API:

```javascript
const deviceResponse = await fetch(
  "https://api.yotoplay.com/device-v2/devices/mine",
  {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }
);
const { devices } = await deviceResponse.json();

// select a device to connect to
const deviceId = devices[0].deviceId;
```

## Step 3: Subscribe to device topics

Once connected, subscribe to these topics for your device:

```javascript
const topics = [
  `device/${deviceId}/events`,
  `device/${deviceId}/status`,
  `device/${deviceId}/response`,
];
```

## Step 4: Send commands

You can now send commands to your device. For example, to set the volume:

```javascript
const volumeTopic = `device/${deviceId}/command/volume/set`;
const volumePayload = { volume: 3 };
mqttClient.publish(volumeTopic, JSON.stringify(volumePayload));
```

## Step 5: Handle messages

The client will receive messages on the subscribed topics:

```javascript
mqttClient.on("message", (topic, message) => {
  const [base, device, messageType] = topic.split("/");

  if (device === deviceId) {
    const payload = JSON.parse(message.toString());

    if (messageType === "events") {
      // Handle device events
    } else if (messageType === "status") {
      // Handle status updates
    } else if (messageType === "response") {
      // Handle command responses
    }
  }
});
```

Don't forget to check if the device you're trying to connect to is online before attempting to connect.