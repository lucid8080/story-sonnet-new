---
title: Authentication Overview
---

Every Yoto app needs permission from users to access their Yoto account. Here’s how it works in practice:

1. **Your users log in via Yoto’s login page and grant access to your app.**
2. **Your app receives a token—a unique string of characters, just like a password—which lets it make API calls and access user data.**

---

## Access Tokens & Refresh Tokens

When building a Yoto app, you’ll use two main types of tokens:

- **Access Tokens:**  
  Short-lived tokens (usually valid for a few hours) that let your app make API requests.
- **Refresh Tokens:**  
  Long-lived tokens used to get new access tokens. This keeps your app connected to the user’s account without needing a fresh login every time.

This process is based on the widely used OAuth2 protocol—so if you’ve built apps for other platforms, you’ll feel right at home.

---

## App Types

Choose the authentication method that fits your app:

### Client-Side Browser Apps

If you’re building an app that runs in the browser (like a pure React app), follow our [Browser Authentication Guide](/authentication/browser-auth).

### Server-Side & CLI Apps

For server-side apps, command-line tools, or anything without a UI, follow our [Server-Side Authentication Guide](/authentication/headless-cli-auth).

---

**Ready to get started? Pick your path and let’s build something brilliant.**