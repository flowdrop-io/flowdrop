---
title: Authentication Patterns
description: Secure your FlowDrop integration with the right auth provider.
---

FlowDrop supports three authentication providers that control how API requests are authenticated. Choose based on your security requirements.

## No Authentication

For development and prototyping when your backend doesn't require auth:

```typescript
import { NoAuthProvider } from '@d34dman/flowdrop/core';

const app = await mountFlowDropApp(container, {
  authProvider: new NoAuthProvider()
});
```

`NoAuthProvider` sends no authentication headers. This is also the default if you don't specify an `authProvider`.

## Static Token Authentication

For simple deployments with a fixed token:

```typescript
import { StaticAuthProvider } from '@d34dman/flowdrop/core';
```

### Bearer Token

```typescript
const authProvider = new StaticAuthProvider({
  type: 'bearer',
  token: 'your-jwt-token'
});
// Sends: Authorization: Bearer your-jwt-token
```

### API Key

```typescript
const authProvider = new StaticAuthProvider({
  type: 'api_key',
  apiKey: 'your-api-key'
});
// Sends: X-API-Key: your-api-key
```

### Custom Headers

```typescript
const authProvider = new StaticAuthProvider({
  type: 'custom',
  headers: {
    'X-Custom-Auth': 'value',
    'X-Tenant-ID': 'tenant-123'
  }
});
```

:::caution
Static tokens cannot be refreshed. If the token expires, FlowDrop API calls will fail with 401 errors until the editor is remounted with a new token.
:::

## Callback Authentication (Enterprise)

For enterprise integrations where your application manages auth:

```typescript
import { CallbackAuthProvider } from '@d34dman/flowdrop/core';

const authProvider = new CallbackAuthProvider({
  // Called before EVERY API request
  getToken: async () => {
    return authService.getAccessToken(); // return null if not authenticated
  },

  // Called when API returns 401
  onUnauthorized: async () => {
    const refreshed = await authService.refreshToken();
    return refreshed; // true = retry request, false = give up
  },

  // Called when API returns 403
  onForbidden: async () => {
    showError("You don't have permission to access this resource");
  }
});
```

### Token Refresh Pattern

The callback provider supports automatic token refresh:

```typescript
const authProvider = new CallbackAuthProvider({
  getToken: async () => {
    // Check if token is still valid
    if (tokenStore.isExpired()) {
      await tokenStore.refresh();
    }
    return tokenStore.getToken();
  },
  onUnauthorized: async () => {
    // Token was rejected by server, try refresh
    try {
      await tokenStore.refresh();
      return true; // retry the failed request
    } catch {
      redirectToLogin();
      return false; // don't retry
    }
  }
});
```

### OAuth2 / OIDC Integration

```typescript
const authProvider = new CallbackAuthProvider({
  getToken: async () => {
    // Get token from your OAuth2 library
    const token = await oidcClient.getUser()?.access_token;
    return token || null;
  },
  onUnauthorized: async () => {
    // Trigger silent token renewal
    try {
      await oidcClient.signinSilent();
      return true;
    } catch {
      // Silent renewal failed, redirect to login
      await oidcClient.signinRedirect();
      return false;
    }
  }
});
```

## Error Handling with Auth

Combine auth providers with the `onApiError` event handler for centralized error management:

```typescript
const app = await mountFlowDropApp(container, {
  authProvider,
  eventHandlers: {
    onApiError: (error, operation) => {
      if (error.message.includes('401')) {
        // Auth provider's onUnauthorized already handled this
        return true; // suppress toast
      }
      if (error.message.includes('403')) {
        showPermissionError(operation);
        return true;
      }
      // Let other errors show the default toast
    }
  }
});
```

## Choosing a Provider

| Scenario | Provider | Why |
|----------|----------|-----|
| Local development | `NoAuthProvider` | No backend auth needed |
| Simple deployment | `StaticAuthProvider` | Token set once at page load |
| Single-page app with JWT | `CallbackAuthProvider` | Token refresh on expiry |
| Enterprise SSO / OAuth2 | `CallbackAuthProvider` | Integrates with auth library |
| Multi-tenant | `StaticAuthProvider` (custom) | Add tenant headers |

## Next Steps

- [Framework Integration](/guides/integration/) — full integration setup
- [Backend Implementation](/guides/integration/backend-implementation/) — implement auth on your backend
- [Event System](/guides/advanced/event-system/) — `onApiError` for auth error handling
