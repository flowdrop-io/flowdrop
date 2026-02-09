# Auth Autocomplete Test Coverage

**Date:** 2026-02-09
**Issue:** https://github.com/flowdrop-io/flowdrop/issues/21
**Status:** Design approved

## Problem

`App.svelte` receives `authProvider` as a prop but fails to forward it to `<ConfigForm>` instances (lines ~740 and ~767). This causes `FormAutocomplete` to make unauthenticated API requests, resulting in 401 errors. This bug has regressed twice.

## Goal

Add test coverage at two layers to prevent future regressions:

1. **Unit test** - Verify the auth header building logic works correctly for all provider types
2. **E2E test** - Verify auth headers flow through the full component chain: `mountFlowDropApp` -> `App.svelte` -> `ConfigForm` -> `FormAutocomplete` -> `fetch`

## Layer 1: Unit Test

### File: `tests/unit/components/FormAutocomplete.test.ts` (extend existing)

### New utility: `src/lib/utils/fetchWithAuth.ts`

Extract the header-building logic from `FormAutocomplete.svelte:194-206` into a standalone function:

```typescript
export async function buildFetchHeaders(
  authProvider?: AuthProvider
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };
  if (authProvider) {
    const authHeaders = await authProvider.getAuthHeaders();
    Object.assign(headers, authHeaders);
  }
  return headers;
}
```

`FormAutocomplete.svelte` imports and uses this utility instead of inline logic.

### Test cases

- `StaticAuthProvider` with bearer token -> `Authorization: Bearer xxx` present
- `StaticAuthProvider` with API key -> `X-API-Key` present
- `StaticAuthProvider` with custom headers -> custom headers merged
- `CallbackAuthProvider` -> `Authorization: Bearer <callback-token>` present
- No `AuthProvider` (undefined) -> only default `Accept`/`Content-Type` headers
- `AuthProvider.getAuthHeaders()` returns empty object -> no auth header added

## Layer 2: Playwright E2E Test

### Auth-required MSW handler

**File:** `src/mocks/handlers/autocomplete.ts` (modify)

Add a new handler at `/api/flowdrop/autocomplete/auth-users`:

- Checks for `Authorization: Bearer test-auth-token-123`
- Returns user suggestions on valid token
- Returns 401 on missing/wrong token

Existing handlers remain unchanged to not break the dev experience.

### Test route

**File:** `src/routes/test/auth-autocomplete/+page.svelte` (new)

Mounts FlowDrop with:

- `StaticAuthProvider` configured with bearer token `test-auth-token-123`
- Pre-populated workflow containing a `task_assignment` node
- The node's assignee autocomplete field URL overridden to `/api/flowdrop/autocomplete/auth-users`
- Minimal UI (no navbar)

### Playwright test

**File:** `tests/e2e/auth-autocomplete.spec.ts` (new)

**Test case 1: Autocomplete includes auth headers (positive)**

1. Navigate to `/test/auth-autocomplete`
2. Wait for the editor to load
3. Click the pre-populated `task_assignment` node to open config panel
4. Find the assignee autocomplete field
5. Click/focus the field (triggers `fetchOnFocus`)
6. Assert the dropdown shows user suggestions (proves auth headers were sent)

**Test case 2: Missing auth returns 401 (negative)**

A variant without `authProvider` that verifies the same interaction results in an error state in the dropdown, confirming the MSW handler rejects unauthenticated requests.

## Out of Scope

- Fixing issue #21 itself (separate PR)
- Structural/source-level assertion of prop forwarding
- Changes to existing MSW autocomplete handlers

## Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/utils/fetchWithAuth.ts` | Create | Extracted auth header utility |
| `src/lib/components/form/FormAutocomplete.svelte` | Modify | Use extracted utility |
| `src/mocks/handlers/autocomplete.ts` | Modify | Add auth-required handler |
| `src/routes/test/auth-autocomplete/+page.svelte` | Create | Test route with auth |
| `tests/unit/components/FormAutocomplete.test.ts` | Modify | Add auth header tests |
| `tests/e2e/auth-autocomplete.spec.ts` | Create | E2E auth propagation tests |

## Dependencies

No new packages needed. Playwright and MSW are already installed.
