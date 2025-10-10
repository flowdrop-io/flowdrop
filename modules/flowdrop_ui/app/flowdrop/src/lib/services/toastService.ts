/**
 * Toast Service
 * Centralized toast notification service using svelte-french-toast
 * Provides consistent toast notifications across the FlowDrop application
 */

import { toast } from 'svelte-french-toast';

/**
 * Toast notification types
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

/**
 * Toast configuration options
 */
export interface ToastOptions {
	duration?: number;
	position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
	action?: {
		label: string;
		onClick: () => void;
	};
}

/**
 * Show a success toast notification
 */
export function showSuccess(message: string, options?: ToastOptions): string {
	return toast.success(message, {
		duration: options?.duration || 4000,
		position: options?.position || 'bottom-center',
		action: options?.action
	});
}

/**
 * Show an error toast notification
 */
export function showError(message: string, options?: ToastOptions): string {
	return toast.error(message, {
		duration: options?.duration || 6000,
		position: options?.position || 'bottom-center',
		action: options?.action
	});
}

/**
 * Show a warning toast notification
 */
export function showWarning(message: string, options?: ToastOptions): string {
	return toast.warning(message, {
		duration: options?.duration || 5000,
		position: options?.position || 'bottom-center',
		action: options?.action
	});
}

/**
 * Show an info toast notification
 */
export function showInfo(message: string, options?: ToastOptions): string {
	return toast.info(message, {
		duration: options?.duration || 4000,
		position: options?.position || 'bottom-center',
		action: options?.action
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
		error: string | ((error: any) => string);
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
 * Show a confirmation toast with action buttons
 */
export function showConfirmation(
	message: string,
	{
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		onConfirm,
		onCancel,
		options
	}: {
		confirmLabel?: string;
		cancelLabel?: string;
		onConfirm: () => void;
		onCancel?: () => void;
		options?: ToastOptions;
	}
): string {
	return toast(message, {
		duration: Infinity,
		position: options?.position || 'bottom-center',
		action: {
			label: confirmLabel,
			onClick: onConfirm
		},
		...options
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
		const message = workflowName ? `Workflow "${workflowName}" saved successfully` : 'Workflow saved successfully';
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
		const message = workflowName ? `Workflow "${workflowName}" deleted successfully` : 'Workflow deleted successfully';
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
		const message = workflowName ? `Workflow "${workflowName}" execution started` : 'Workflow execution started';
		return showInfo(message);
	},

	/**
	 * Show workflow execution completed
	 */
	executionCompleted: (workflowName?: string) => {
		const message = workflowName ? `Workflow "${workflowName}" execution completed` : 'Workflow execution completed';
		return showSuccess(message);
	},

	/**
	 * Show workflow export success
	 */
	exported: (workflowName?: string) => {
		const message = workflowName ? `Workflow "${workflowName}" exported successfully` : 'Workflow exported successfully';
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
		const message = pipelineName ? `Pipeline "${pipelineName}" created successfully` : 'Pipeline created successfully';
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
