/**
 * Toast Service
 * Centralized toast notification service using svelte-french-toast
 * Provides consistent toast notifications across the FlowDrop application
 */

import { get } from 'svelte/store';
import {
  toast,
  useToasterStore,
  type DefaultToastOptions,
  type Renderable
} from 'svelte-5-french-toast';
import { TOAST_DURATION } from '../config/constants.js';
import { errorDetails } from '../api/enhanced-client.js';
import DismissibleToast from '../components/toast/DismissibleToast.svelte';
import {
  SUCCESS_TOAST_ID,
  planToastEviction,
  type ActiveToast,
  type ToastAction,
  type ToastKind
} from './toastQueue.js';

export type { ToastAction } from './toastQueue.js';

/**
 * TYPE DEBT — remove when svelte-5-french-toast types `Renderable` as
 * Svelte 5's `Component` instead of the legacy `SvelteComponent` class
 * (dist/core/types.d.ts). The runtime renders a Svelte 5 component fine;
 * only the declaration is behind, so this is the one place the lie lives.
 */
const asRenderable = <P extends Record<string, unknown>>(component: unknown) =>
  component as Renderable<P>;
const toastBody = asRenderable<{
  text: string;
  body?: string;
  details?: readonly string[];
  action?: ToastAction;
  kind: ToastKind;
  dismissible: boolean;
}>(DismissibleToast);

/**
 * Default toast options themed with FlowDrop design tokens.
 * Use with <Toaster toastOptions={flowdropToastOptions} containerClassName="flowdrop-toaster" />
 * and import '@flowdrop/flowdrop/styles/toast.css' (or app toast.css) so toast bar styles apply.
 */
export const flowdropToastOptions: DefaultToastOptions = {
  className: 'flowdrop-toast-bar',
  style: '',
  success: {
    iconTheme: {
      primary: 'var(--fd-success)',
      secondary: 'var(--fd-success-foreground)'
    }
  },
  error: {
    iconTheme: {
      primary: 'var(--fd-error)',
      secondary: 'var(--fd-error-foreground)'
    }
  },
  loading: {
    iconTheme: {
      primary: 'var(--fd-primary)',
      secondary: 'var(--fd-primary-muted)'
    }
  }
};

/** Container class for FlowDrop-themed Toaster (used with toast.css). */
export const FLOWDROP_TOASTER_CLASS = 'flowdrop-toaster';

/**
 * Toast notification types
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

/**
 * A message built from parts instead of one joined string: `title` says what
 * happened, `body` why, `details` lists the reasons behind it and `action`
 * offers the next step.
 */
export interface ToastContent {
  title: string;
  body?: string;
  details?: readonly string[];
  action?: ToastAction;
}

/** What the show* helpers take: a plain string (the title) or its parts. */
export type ToastInput = string | ToastContent;

/**
 * Toast configuration options
 */
export interface ToastOptions {
  duration?: number;
  /**
   * Reasons behind the message, rendered as a list under it (errors and
   * warnings only). Pass `ApiError.details` here. Same as `details` on a
   * `ToastContent`; the content's own list wins.
   */
  details?: readonly string[];
  /** Same as `action` on a `ToastContent`; the content's own action wins. */
  action?: ToastAction;
  /**
   * Stable id: a toast with the same id replaces the one already showing
   * instead of stacking. Errors and warnings default to an id derived from
   * their text, so repeating a failing action does not wallpaper the screen;
   * successes share one id, so a new success replaces the last.
   */
  id?: string;
  position?:
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right';
}

const DEFAULT_POSITION = 'top-center';

function toContent(input: ToastInput, options?: ToastOptions): ToastContent {
  const content = typeof input === 'string' ? { title: input } : input;
  return {
    ...content,
    details: content.details ?? options?.details,
    action: content.action ?? options?.action
  };
}

/** Default id for a persistent toast: one per distinct text. */
function dedupeId(kind: string, content: ToastContent): string {
  return `${kind}:${[content.title, content.body ?? '', ...(content.details ?? [])].join('\n')}`;
}

/** The toasts on screen now, for the queue rules. */
function activeToasts(): ActiveToast[] {
  return get(useToasterStore().toasts)
    .filter((t) => t.visible)
    .map((t) => ({
      id: t.id,
      kind: (t.props?.kind as ToastKind | undefined) ?? (t.type === 'loading' ? 'loading' : 'info'),
      createdAt: t.createdAt
    }));
}

/** Apply the queue rules (one success at a time, at most three visible), then show. */
function present(
  kind: Exclude<ToastKind, 'loading'>,
  input: ToastInput,
  options: ToastOptions | undefined,
  defaults: { duration: number; id?: string; dismissible: boolean }
): string {
  const content = toContent(input, options);
  const id = options?.id ?? defaults.id ?? dedupeId(kind, content);
  for (const evicted of planToastEviction(activeToasts(), { id, kind })) {
    toast.dismiss(evicted);
  }
  return toast(toastBody, {
    id,
    props: {
      text: content.title,
      body: content.body,
      details: content.details ?? [],
      action: content.action,
      kind,
      dismissible: defaults.dismissible
    },
    duration: options?.duration ?? defaults.duration,
    position: options?.position ?? DEFAULT_POSITION
  });
}

/**
 * Show a success toast notification. One line; a new success replaces the
 * previous one instead of stacking.
 */
export function showSuccess(message: ToastInput, options?: ToastOptions): string {
  return present('success', message, options, {
    duration: TOAST_DURATION.SUCCESS,
    id: SUCCESS_TOAST_ID,
    dismissible: false
  });
}

/**
 * Show an error toast notification.
 *
 * Takes a string, or its parts: `showError({ title, body, details, action })`.
 * Stays until the user closes it (TOAST_DURATION.ERROR is Infinity). Pass a
 * finite `duration` to opt back into auto-dismiss.
 */
export function showError(message: ToastInput, options?: ToastOptions): string {
  return present('error', message, options, {
    duration: TOAST_DURATION.ERROR,
    dismissible: true
  });
}

/**
 * Show a warning toast notification.
 *
 * Persists until dismissed, like an error. The stance behind that: a warning
 * here is not "done, by the way" — the editor reserves it for something the
 * user should act on (an agent's config key that was ignored, an import that
 * dropped nodes), and a message like that must not vanish mid-read. Pass a
 * finite `duration` for a warning that is only informational. Wears its own
 * glyph and colour so it is not mistaken for an error.
 */
export function showWarning(message: ToastInput, options?: ToastOptions): string {
  return present('warning', message, options, {
    duration: TOAST_DURATION.WARNING,
    dismissible: true
  });
}

/**
 * Show an info toast notification
 */
export function showInfo(message: ToastInput, options?: ToastOptions): string {
  return present('info', message, options, {
    duration: TOAST_DURATION.INFO,
    dismissible: false
  });
}

/**
 * Show a loading toast notification
 */
export function showLoading(message: string, options?: ToastOptions): string {
  return toast.loading(message, {
    id: options?.id,
    duration: options?.duration ?? Infinity,
    position: options?.position ?? DEFAULT_POSITION
  });
}

/**
 * Dismiss a specific toast by ID
 */
export function dismissToast(toastId: string): void {
  toast.dismiss(toastId);
}

/**
 * Dismiss all toasts
 */
export function dismissAllToasts(): void {
  toast.dismiss();
}

/**
 * Show a promise-based toast (loading -> success/error)
 */
export function showPromise<T>(
  promise: Promise<T>,
  {
    loading,
    success,
    error,
    options
  }: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: unknown) => string);
    options?: ToastOptions;
  }
): Promise<T> {
  return toast.promise(promise, {
    loading,
    success,
    error,
    ...options
  });
}

/**
 * Show a confirmation toast (simplified version without action buttons)
 */
export function showConfirmation(message: string, options?: ToastOptions): string {
  return toast(message, {
    id: options?.id,
    duration: options?.duration ?? TOAST_DURATION.CONFIRMATION,
    position: options?.position ?? DEFAULT_POSITION
  });
}

/** The reasons of a thrown error, as parts of a toast: `body` is its message; see `errorDetails`. */
function errorParts(error: string | Error): { message: string; details: readonly string[] } {
  if (typeof error === 'string') return { message: error, details: [] };
  return { message: error.message, details: errorDetails(error) };
}

/** An error toast whose title names the failed action and whose body says why. */
function failure(title: string, error: string | Error): string {
  const { message, details } = errorParts(error);
  return showError({ title, body: message, details });
}

/**
 * API-specific toast helpers
 */
export const apiToasts = {
  /**
   * Show API success message
   */
  success: (operation: string, details?: string) => {
    const message = details ? `${operation}: ${details}` : operation;
    return showSuccess(message);
  },

  /**
   * Show API error message
   */
  error: (operation: string, error: string | Error) => {
    return failure(`${operation} failed`, error);
  },

  /**
   * Show API loading message
   */
  loading: (operation: string) => {
    return showLoading(`${operation}...`);
  },

  /**
   * Show API promise with automatic success/error handling
   */
  promise: <T>(
    promise: Promise<T>,
    operation: string,
    options?: {
      successMessage?: string;
      errorMessage?: string;
    }
  ) => {
    return showPromise(promise, {
      loading: `${operation}...`,
      success: options?.successMessage || `${operation} completed successfully`,
      error: options?.errorMessage || `${operation} failed`
    });
  }
};

/**
 * Workflow-specific toast helpers
 */
export const workflowToasts = {
  /**
   * Show workflow save success
   */
  saved: (workflowName?: string) => {
    const message = workflowName
      ? `Workflow "${workflowName}" saved successfully`
      : 'Workflow saved successfully';
    return showSuccess(message);
  },

  /**
   * Show workflow save error
   */
  saveError: (error: string | Error) => {
    return failure("Couldn't save the workflow", error);
  },

  /**
   * Show workflow delete success
   */
  deleted: (workflowName?: string) => {
    const message = workflowName
      ? `Workflow "${workflowName}" deleted successfully`
      : 'Workflow deleted successfully';
    return showSuccess(message);
  },

  /**
   * Show workflow delete error
   */
  deleteError: (error: string | Error) => {
    return failure("Couldn't delete the workflow", error);
  },

  /**
   * Show workflow execution started
   */
  executionStarted: (workflowName?: string) => {
    const message = workflowName
      ? `Workflow "${workflowName}" execution started`
      : 'Workflow execution started';
    return showInfo(message);
  },

  /**
   * Show workflow execution completed
   */
  executionCompleted: (workflowName?: string) => {
    const message = workflowName
      ? `Workflow "${workflowName}" execution completed`
      : 'Workflow execution completed';
    return showSuccess(message);
  },

  /**
   * Show workflow export success
   */
  exported: (workflowName?: string) => {
    const message = workflowName
      ? `Workflow "${workflowName}" exported successfully`
      : 'Workflow exported successfully';
    return showSuccess(message);
  },

  /**
   * Show workflow execution error
   */
  executionError: (error: string | Error) => {
    return failure('Workflow execution failed', error);
  }
};

/**
 * Pipeline-specific toast helpers
 */
export const pipelineToasts = {
  /**
   * Show pipeline creation success
   */
  created: (pipelineName?: string) => {
    const message = pipelineName
      ? `Pipeline "${pipelineName}" created successfully`
      : 'Pipeline created successfully';
    return showSuccess(message);
  },

  /**
   * Show pipeline creation error
   */
  creationError: (error: string | Error) => {
    return failure("Couldn't create the pipeline", error);
  },

  /**
   * Show pipeline execution started
   */
  executionStarted: (pipelineId: string) => {
    return showInfo(`Pipeline ${pipelineId} execution started`);
  },

  /**
   * Show pipeline execution completed
   */
  executionCompleted: (pipelineId: string) => {
    return showSuccess(`Pipeline ${pipelineId} execution completed`);
  },

  /**
   * Show pipeline execution error
   */
  executionError: (pipelineId: string, error: string | Error) => {
    return failure(`Pipeline ${pipelineId} execution failed`, error);
  },

  /**
   * Show pipeline status update
   */
  statusUpdate: (pipelineId: string, status: string) => {
    return showInfo(`Pipeline ${pipelineId} status: ${status}`);
  }
};
