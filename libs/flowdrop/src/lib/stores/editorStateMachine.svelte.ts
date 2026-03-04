/**
 * Editor State Machine for WorkflowEditor (Svelte 5 Runes)
 *
 * Centralizes all reactive guard logic into explicit states and transitions.
 * Replaces scattered boolean flags (isDraggingNode, isRestoringFromHistory,
 * lastEditorStoreValue identity checks) with a single source of truth.
 *
 * @module stores/editorStateMachine
 */

import { logger } from '../utils/logger.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EditorState =
	| 'uninitialized'
	| 'loading'
	| 'idle'
	| 'dragging'
	| 'connecting'
	| 'dropping'
	| 'restoring'
	| 'deleting'
	| 'updating_node';

export type EditorEvent =
	| 'WORKFLOW_LOADED'
	| 'LOAD_COMPLETE'
	| 'START_DRAG'
	| 'STOP_DRAG'
	| 'START_CONNECT'
	| 'CONNECTION_MADE'
	| 'CONNECTION_CANCELLED'
	| 'START_DROP'
	| 'DROP_COMPLETE'
	| 'DROP_CANCELLED'
	| 'START_RESTORE'
	| 'RESTORE_COMPLETE'
	| 'EXTERNAL_STORE_CHANGE'
	| 'SYNC_COMPLETE'
	| 'START_DELETE'
	| 'DELETE_COMPLETE'
	| 'START_NODE_UPDATE'
	| 'UPDATE_COMPLETE'
	| 'WORKFLOW_SWITCHED'
	| 'WORKFLOW_CLEARED'
	| 'RESET';

/** What operations are permitted in the current state */
export interface StatePermissions {
	/** Whether the editor can write to the global workflow store */
	canWriteToStore: boolean;
	/** Whether the editor can push to undo/redo history */
	canPushHistory: boolean;
	/** Suppress the store → flowNodes/flowEdges sync effect */
	suppressEffect: boolean;
}

// ---------------------------------------------------------------------------
// Transition table
// ---------------------------------------------------------------------------

type TransitionMap = Partial<Record<EditorEvent, EditorState>>;

const transitions: Record<EditorState, TransitionMap> = {
	uninitialized: {
		WORKFLOW_LOADED: 'loading'
	},
	loading: {
		LOAD_COMPLETE: 'idle'
	},
	idle: {
		START_DRAG: 'dragging',
		START_CONNECT: 'connecting',
		START_DROP: 'dropping',
		START_RESTORE: 'restoring',
		EXTERNAL_STORE_CHANGE: 'loading',
		START_DELETE: 'deleting',
		START_NODE_UPDATE: 'updating_node',
		WORKFLOW_SWITCHED: 'loading',
		WORKFLOW_CLEARED: 'uninitialized'
	},
	dragging: {
		STOP_DRAG: 'idle'
	},
	connecting: {
		CONNECTION_MADE: 'idle',
		CONNECTION_CANCELLED: 'idle'
	},
	dropping: {
		DROP_COMPLETE: 'idle',
		DROP_CANCELLED: 'idle'
	},
	restoring: {
		RESTORE_COMPLETE: 'idle'
	},
	deleting: {
		DELETE_COMPLETE: 'idle'
	},
	updating_node: {
		UPDATE_COMPLETE: 'idle'
	}
};

/** Global transitions valid from any state */
const globalTransitions: Partial<Record<EditorEvent, EditorState>> = {
	RESET: 'uninitialized',
	WORKFLOW_CLEARED: 'uninitialized'
};

// ---------------------------------------------------------------------------
// Permissions table
// ---------------------------------------------------------------------------

const permissions: Record<EditorState, StatePermissions> = {
	uninitialized: { canWriteToStore: false, canPushHistory: false, suppressEffect: false },
	loading: { canWriteToStore: false, canPushHistory: false, suppressEffect: false },
	idle: { canWriteToStore: true, canPushHistory: true, suppressEffect: false },
	dragging: { canWriteToStore: true, canPushHistory: false, suppressEffect: true },
	connecting: { canWriteToStore: true, canPushHistory: false, suppressEffect: true },
	dropping: { canWriteToStore: true, canPushHistory: false, suppressEffect: true },
	restoring: { canWriteToStore: true, canPushHistory: false, suppressEffect: true },
	deleting: { canWriteToStore: true, canPushHistory: false, suppressEffect: true },
	updating_node: { canWriteToStore: true, canPushHistory: false, suppressEffect: true }
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface EditorStateMachine {
	/** Current state (reactive via $state) */
	readonly current: EditorState;
	/** Current permissions (reactive, derived from current state) */
	readonly permissions: StatePermissions;
	/** Attempt a transition. Returns true if the transition was valid. */
	send(event: EditorEvent): boolean;
	/** Check if an event is valid from the current state */
	canSend(event: EditorEvent): boolean;
	/** Subscribe to state changes (for debugging/logging). Returns unsubscribe function. */
	onTransition(
		callback: (from: EditorState, event: EditorEvent, to: EditorState) => void
	): () => void;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create an editor state machine instance.
 *
 * Uses Svelte 5 `$state` rune for reactivity so that components can
 * read `machine.current` and `machine.permissions` inside `$derived`
 * or `$effect` blocks and react to state changes.
 *
 * Each WorkflowEditor component instance should create its own machine.
 */
export function createEditorStateMachine(
	initialState: EditorState = 'uninitialized'
): EditorStateMachine {
	let _current = $state<EditorState>(initialState);
	let _permissions = $state<StatePermissions>(permissions[initialState]);
	const _listeners = new Set<
		(from: EditorState, event: EditorEvent, to: EditorState) => void
	>();

	function send(event: EditorEvent): boolean {
		// Check global transitions first (valid from any state)
		const globalTarget = globalTransitions[event];
		if (globalTarget !== undefined) {
			const from = _current;
			_current = globalTarget;
			_permissions = permissions[globalTarget];
			for (const cb of _listeners) cb(from, event, globalTarget);
			return true;
		}

		// Check state-specific transitions
		const stateTransitions = transitions[_current];
		const target = stateTransitions?.[event];
		if (target === undefined) {
			logger.warn(`[EditorFSM] Invalid transition: ${_current} + ${event}`);
			return false;
		}

		const from = _current;
		_current = target;
		_permissions = permissions[target];
		for (const cb of _listeners) cb(from, event, target);
		return true;
	}

	function canSend(event: EditorEvent): boolean {
		if (globalTransitions[event] !== undefined) return true;
		return transitions[_current]?.[event] !== undefined;
	}

	function onTransition(
		callback: (from: EditorState, event: EditorEvent, to: EditorState) => void
	): () => void {
		_listeners.add(callback);
		return () => {
			_listeners.delete(callback);
		};
	}

	return {
		get current() {
			return _current;
		},
		get permissions() {
			return _permissions;
		},
		send,
		canSend,
		onTransition
	};
}
