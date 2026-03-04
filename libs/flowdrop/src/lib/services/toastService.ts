/**
 * Toast Service
 * Centralized toast notification service using svelte-french-toast
 * Provides consistent toast notifications across the FlowDrop application
 */

import { toast, type DefaultToastOptions } from 'svelte-5-french-toast';
import { TOAST_DURATION } from '../config/constants.js';

/**
 * Default toast options themed with FlowDrop design tokens.
 * Use with <Toaster toastOptions={flowdropToastOptions} containerClassName="flowdrop-toaster" />
 * and import '@d34dman/flowdrop/styles/toast.css' (or app toast.css) so toast bar styles apply.
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
 * Toast configuration options
 */
export interface ToastOptions {
	duration?: number;
	position?:
		| 'top-left'
		| 'top-center'
		| 'top-right'
		| 'bottom-left'
		| 'bottom-center'
		| 'bottom-right';
}

/**
 * Show a success toast notification
 */
export function showSuccess(message: string, options?: ToastOptions): string {
	return toast.success(message, {
		duration: options?.duration || TOAST_DURATION.SUCCESS,
		position: options?.position || 'bottom-center'
	});
}

/**
 * Show an error toast notification
 */
export function showError(message: string, options?: ToastOptions): string {
	return toast.error(message, {
		duration: options?.duration || TOAST_DURATION.ERROR,
		position: options?.position || 'bottom-center'
	});
}

/**
 * Show a warning toast notification
 */
export function showWarning(message: string, options?: ToastOptions): string {
	return toast.error(message, {
		duration: options?.duration || TOAST_DURATION.WARNING,
		position: options?.position || 'bottom-center'
	});
}

/**
 * Show an info toast notification
 */
export function showInfo(message: string, options?: ToastOptions): string {
	return toast.success(message, {
		duration: options?.duration || TOAST_DURATION.INFO,
		position: options?.position || 'bottom-center'
	});
}

/**
 * Show a loading toast notification
 */
export function showLoading(message: string, options?: ToastOptions): string {
	return toast.loading(message, {
		duration: options?.duration || Infinity,
		position: options?.position || 'bottom-center'
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
		duration: options?.duration || TOAST_DURATION.CONFIRMATION,
		position: options?.position || 'bottom-center'
	});
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
		const errorMessage = error instanceof Error ? error.message : error;
		return showError(`${operation} failed: ${errorMessage}`);
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
		const errorMessage = error instanceof Error ? error.message : error;
		return showError(`Failed to save workflow: ${errorMessage}`);
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
		const errorMessage = error instanceof Error ? error.message : error;
		return showError(`Failed to delete workflow: ${errorMessage}`);
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
		const errorMessage = error instanceof Error ? error.message : error;
		return showError(`Workflow execution failed: ${errorMessage}`);
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
		const errorMessage = error instanceof Error ? error.message : error;
		return showError(`Failed to create pipeline: ${errorMessage}`);
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
		const errorMessage = error instanceof Error ? error.message : error;
		return showError(`Pipeline ${pipelineId} execution failed: ${errorMessage}`);
	},

	/**
	 * Show pipeline status update
	 */
	statusUpdate: (pipelineId: string, status: string) => {
		return showInfo(`Pipeline ${pipelineId} status: ${status}`);
	}
};
