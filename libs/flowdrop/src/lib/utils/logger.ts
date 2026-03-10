/**
 * FlowDrop Logger
 *
 * Lightweight configurable logger for the FlowDrop library.
 * Disabled by default — consumers enable it for debugging.
 *
 * @module utils/logger
 *
 * @example
 * ```typescript
 * import { setLogLevel } from '@flowdrop/flowdrop/core';
 *
 * // Enable debug logging during development
 * setLogLevel('debug');
 *
 * // Enable only warnings and errors
 * setLogLevel('warn');
 *
 * // Disable all logging (default)
 * setLogLevel('none');
 * ```
 */

/** Log severity levels. `'none'` disables all output. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

const LOG_PRIORITY: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
	none: 4
};

let currentLevel: LogLevel = 'none';

/**
 * Set the minimum log level for FlowDrop library output.
 * Messages below this level are silently discarded.
 *
 * @param level - The minimum severity to display. Use `'none'` to disable all output.
 */
export function setLogLevel(level: LogLevel): void {
	currentLevel = level;
}

/**
 * Get the current log level.
 */
export function getLogLevel(): LogLevel {
	return currentLevel;
}

function shouldLog(level: LogLevel): boolean {
	return LOG_PRIORITY[level] >= LOG_PRIORITY[currentLevel];
}

/**
 * FlowDrop library logger.
 *
 * All methods are no-ops when the log level is set to `'none'` (default).
 * Enable output by calling `setLogLevel()`.
 */
export const logger = {
	debug(message: string, ...args: unknown[]): void {
		if (shouldLog('debug')) console.debug(`[FlowDrop] ${message}`, ...args);
	},
	info(message: string, ...args: unknown[]): void {
		if (shouldLog('info')) console.info(`[FlowDrop] ${message}`, ...args);
	},
	warn(message: string, ...args: unknown[]): void {
		if (shouldLog('warn')) console.warn(`[FlowDrop] ${message}`, ...args);
	},
	error(message: string, ...args: unknown[]): void {
		if (shouldLog('error')) console.error(`[FlowDrop] ${message}`, ...args);
	}
};
