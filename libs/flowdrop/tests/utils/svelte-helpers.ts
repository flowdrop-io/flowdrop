/**
 * Svelte-specific test helpers
 *
 * Utilities for testing Svelte components with Testing Library.
 *
 * Note: Install @testing-library/svelte and @testing-library/user-event to use these utilities
 */

// import { render, type RenderResult } from "@testing-library/svelte";
// import type { ComponentProps, Component } from "svelte";
// import userEvent from "@testing-library/user-event";

/**
 * Render a Svelte component with user event setup
 *
 * This is a convenience wrapper that sets up both the component
 * and user event utilities in one call.
 *
 * TODO: Uncomment when dependencies are installed
 */
export function renderWithUser<T>(
  component: T,
  props?: Record<string, unknown>,
): unknown {
  throw new Error(
    "Install @testing-library/svelte and @testing-library/user-event to use renderWithUser",
  );
}

/**
 * Wait for Svelte to finish updating
 *
 * Useful when you need to ensure all reactive updates have completed.
 */
export async function tick(times = 1): Promise<void> {
  for (let i = 0; i < times; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

/**
 * Get a component's reactive state
 *
 * Helper to access internal state for testing purposes.
 */
export function getComponentState<T>(result: unknown): T {
  // This is a simplified version - in practice, you'd access the component instance
  return result as T;
}

/**
 * Trigger a custom event on an element
 */
export function fireCustomEvent(
  element: HTMLElement,
  eventName: string,
  detail?: unknown,
): void {
  const event = new CustomEvent(eventName, {
    detail,
    bubbles: true,
    cancelable: true,
  });
  element.dispatchEvent(event);
}

/**
 * Wait for an element to be removed
 */
export async function waitForRemoval(
  element: HTMLElement,
  timeout = 1000,
): Promise<void> {
  const startTime = Date.now();

  while (document.body.contains(element)) {
    if (Date.now() - startTime > timeout) {
      throw new Error("Element was not removed within timeout");
    }
    await tick();
  }
}

/**
 * Mock a Svelte store for testing
 */
export function createMockStore<T>(initialValue: T) {
  let value = initialValue;
  const subscribers = new Set<(value: T) => void>();

  return {
    subscribe(callback: (value: T) => void) {
      subscribers.add(callback);
      callback(value);
      return () => subscribers.delete(callback);
    },
    set(newValue: T) {
      value = newValue;
      subscribers.forEach((callback) => callback(value));
    },
    update(updater: (value: T) => T) {
      value = updater(value);
      subscribers.forEach((callback) => callback(value));
    },
    get() {
      return value;
    },
  };
}

/**
 * Create a mock writable store with additional test utilities
 */
export function createTestStore<T>(initialValue: T) {
  const store = createMockStore(initialValue);
  const history: T[] = [initialValue];

  const originalSet = store.set;
  store.set = (newValue: T) => {
    history.push(newValue);
    originalSet(newValue);
  };

  return {
    ...store,
    history,
    reset: () => {
      history.length = 0;
      history.push(initialValue);
      store.set(initialValue);
    },
  };
}
