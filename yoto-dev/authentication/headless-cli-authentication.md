---
title: Headless / CLI Authentication
---

This page shows you how to authenticate Yoto users in server-side apps or CLI tools that don't have a UI.

These steps aren't specific to Yoto but part of the OAuth2 protocol [^1]. Don't worry if you've never heard that term before.

The example code is written in JavaScript, but the concepts apply to any language that can make HTTP requests.

[^1]: This is specifically the Device Code flow.

## How It Works

This authentication flow is similar to adding a Netflix account to a smart TV or a console:

1. Your streaming app shows the user a code and verification URL/QR code to visit
2. The user visits that URL on their phone/computer and enters the code
3. Your app polls until the user completes the process
4. Your app is then given access to the user's account

:::caution
This is only works with **Public Clients**. Please make sure you've created a public client in the developer dashboard.
:::

## 1. Initialize the device login process

The user will need to visit a URL on their phone/computer and enter a code. You'll get this URL by making a request to the `/oauth/device/code` endpoint:

```js
const deviceAuthUrl = "https://login.yotoplay.com/oauth/device/code";

// Request a device code
const response = await fetch(deviceAuthUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: new URLSearchParams({
    // this is the client id that we've given you
    client_id: "[YOUR-CLIENT-ID]",
    scope: "profile offline_access",
    audience: "https://api.yotoplay.com",
  }),
});

if (!response.ok) {
  throw new Error(`Device authorization failed: ${response.statusText}`);
}

const result = await response.json();

// Extract values from the authorization response
const {
  device_code,
  verification_uri,
  verification_uri_complete,
  user_code,
  interval = 5,
  expires_in = 300, // Default to 5 minutes if not provided
} = result;
```

The authorization response will look like this:

```json
{
  "device_code": "bP61dyeO3ULD42AE8QkggUgp", // To be used in the next step to poll for completion
  "verification_uri": "https://login.yotoplay.com/activate", // The URL where the user verifies their device
  "verification_uri_complete": "https://login.yotoplay.com/activate?user_code=ZDTT-NSTF", // The verification URL with the code included
  "user_code": "ZDTT-NSTF", // The short code the user need to enter
  "interval": 5, // How often to poll for completion, in seconds
  "expires_in": 300 // How long the device code is valid for, in seconds
}
```

## 2. Display login instructions to the user

Give the user the verification URL and the verification code. Then the user needs to visit the URL and enter the code on their device.

```js
console.log("To authorize this app, please visit:");
console.log(verification_uri);
console.log("And enter this code:");
console.log(user_code);

// `verification_uri_complete` already includes the code
console.log("Or visit this URL directly:");
console.log(verification_uri_complete);
```

The URL will look like this:

`https://login.yotoplay.com/activate?user_code=ZDTT-NSTF`

## 3. Poll for the access token

While the user goes to the URL and enters the code on their device, your application needs to poll Yoto's servers with the `device_code` that it received in the previous response.

```javascript
const tokenUrl = "https://login.yotoplay.com/oauth/token";

// Helper function for delays
const sleep = (t) => new Promise((resolve) => setTimeout(resolve, t));

// Poll for the token using the interval provided by the previous response
let intervalMs = interval * 1000;

while (true) {
  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      device_code,
      client_id: clientId,
      audience: "https://api.yotoplay.com",
    }),
  });

  const responseBody = await tokenResponse.json();

  // If we get a successful response (200), return the tokens
  if (tokenResponse.ok) {
    console.log("Authorization successful, received tokens");
    const accessToken = responseBody.access_token;
    const refreshToken = responseBody.refresh_token;

    console.log("Access token:", accessToken);
    console.log("Refresh token:", refreshToken);
    break;
  }

  // Handle authorization pending and other OAuth errors
  if (tokenResponse.status === 403) {
    const errorData = responseBody;
    if (errorData.error === "authorization_pending") {
      // User hasn't completed authorization yet, wait and continue polling
      console.log("Authorization pending, waiting...");
      await sleep(intervalMs);
      continue;
    } else if (errorData.error === "slow_down") {
      // Increase polling interval
      intervalMs += 5000;
      console.log(`Received slow_down, increasing interval to ${intervalMs}ms`);
      await sleep(intervalMs);
      continue;
    } else if (errorData.error === "expired_token") {
      throw new Error(
        "Device code has expired. Please restart the device login process."
      );
    } else {
      console.log(`Token request failed:`, errorData);
      throw new Error(errorData.error_description || errorData.error);
    }
  }

  // If we get here, it's an unexpected error
  throw new Error(`Token request failed: ${tokenResponse.statusText}`);
}
```

When the user completes the process, you'll get a response with a 200 status code that contains the access token and refresh token.

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.JzdWIiOiI",
  "refresh_token": "1NiIsInR5cCI6IkpXVCJ9.IiOiI"
}
```

::: tip Access Token? Refresh Token? 🤔
If you're not sure what these terms are, refer to our [Authentication Overview](/authentication/auth)
:::

## 4. Use the access token to make API requests

Now that you've got an access token, you can make API calls to Yoto's services:

```javascript
const response = await fetch("https://api.yotoplay.com/content/mine", {
  headers: {
    Authorization: `Bearer ${access_token}`,
  },
});

const data = await response.json();
console.log(data.cards);
// you should see an array of cards in the console
```

## 5. Checking token expiration

Access tokens are JWTs (JSON Web Tokens) which contain their own expiration information. You have to decode the token to check when it expires:

```javascript
// Simple function to decode the JWT payload (middle part)
function decodeJwt(token) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = Buffer.from(base64, "base64").toString("utf8");
  return JSON.parse(jsonPayload);
}

// Check if the token is expired
function isTokenExpired(token) {
  try {
    const decoded = decodeJwt(token);
    // exp is in seconds, Date.now() is in milliseconds
    // Add a 30-second buffer to refresh before it actually expires
    return decoded.exp * 1000 < Date.now() + 30000;
  } catch (error) {
    console.error("Error decoding token:", error);
    return true; // If we can't decode it, assume it's expired
  }
}

// Usage
if (isTokenExpired(access_token)) {
  console.log("Token is expired or about to expire, refreshing...");
  // Proceed to refresh the token
} else {
  console.log("Token is still valid");
}
```

## 6. Refreshing your tokens

When your access token expires, you'll need to get a new set of tokens, which means using your refresh token to get a new access token as well as a new refresh token.

```javascript
const tokenUrl = "https://login.yotoplay.com/oauth/token";

const refreshResponse = await fetch(tokenUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: new URLSearchParams({
    grant_type: "refresh_token",
    client_id: "[YOUR-CLIENT-ID]",
    refresh_token: "[YOUR-REFRESH-TOKEN]",
  }),
});

const { access_token, refresh_token } = await refreshResponse.json();

// Now you can continue making API requests with the new access token
```

## Next Steps

Now that you've got authentication working:

- Check out our [API Reference](/api/) to see all the available endpoints
- Explore [our sample apps](/get-started/sample-apps)