<!--
  MainLayout Component
  Provides a flexible layout with:
  - Full width fixed-height header (optional)
  - Three-column main area with optional resizable split panes
  - Left sidebar, center main content, right sidebar
  - Full width fixed-height footer (optional)
  
  Uses Svelte 5 runes and BEM syntax
-->

<script lang="ts">
	import { onMount } from 'svelte';

	/**
	 * Configuration props for the MainLayout component
	 */
	interface Props {
		/** Height of the header in pixels */
		headerHeight?: number;
		/** Height of the footer in pixels */
		footerHeight?: number;
		/** Whether to show the header */
		showHeader?: boolean;
		/** Whether to show the footer */
		showFooter?: boolean;
		/** Whether to show the left sidebar */
		showLeftSidebar?: boolean;
		/** Whether to show the right sidebar */
		showRightSidebar?: boolean;
		/** Whether to show the bottom panel */
		showBottomPanel?: boolean;
		/** Initial width of the left sidebar in pixels */
		leftSidebarWidth?: number;
		/** Initial width of the right sidebar in pixels */
		rightSidebarWidth?: number;
		/** Initial height of the bottom panel in pixels */
		bottomPanelHeight?: number;
		/** Minimum width for left sidebar in pixels */
		leftSidebarMinWidth?: number;
		/** Maximum width for left sidebar in pixels */
		leftSidebarMaxWidth?: number;
		/** Minimum width for right sidebar in pixels */
		rightSidebarMinWidth?: number;
		/** Maximum width for right sidebar in pixels */
		rightSidebarMaxWidth?: number;
		/** Minimum height for bottom panel in pixels */
		bottomPanelMinHeight?: number;
		/** Maximum height for bottom panel in pixels */
		bottomPanelMaxHeight?: number;
		/** Whether to enable split pane resizing for left sidebar */
		enableLeftSplitPane?: boolean;
		/** Whether to enable split pane resizing for right sidebar */
		enableRightSplitPane?: boolean;
		/** Whether to enable split pane resizing for bottom panel */
		enableBottomSplitPane?: boolean;
		/** Background color for the main layout */
		backgroundColor?: string;
		/** Custom CSS class for the layout container */
		class?: string;
		/** Slot for header content */
		header?: import('svelte').Snippet;
		/** Slot for left sidebar content */
		leftSidebar?: import('svelte').Snippet;
		/** Slot for right sidebar content */
		rightSidebar?: import('svelte').Snippet;
		/** Slot for bottom panel content */
		bottomPanel?: import('svelte').Snippet;
		/** Slot for footer content */
		footer?: import('svelte').Snippet;
		/** Slot for main content (default slot) */
		children?: import('svelte').Snippet;
	}

	let {
		headerHeight = 60,
		footerHeight = 48,
		showHeader = true,
		showFooter = false,
		showLeftSidebar = true,
		showRightSidebar = true,
		showBottomPanel = false,
		leftSidebarWidth: initialLeftWidth = 280,
		rightSidebarWidth: initialRightWidth = 320,
		bottomPanelHeight: initialBottomHeight = 300,
		leftSidebarMinWidth = 200,
		leftSidebarMaxWidth = 500,
		rightSidebarMinWidth = 200,
		rightSidebarMaxWidth = 500,
		bottomPanelMinHeight = 150,
		bottomPanelMaxHeight = 500,
		enableLeftSplitPane = true,
		enableRightSplitPane = true,
		enableBottomSplitPane = true,
		backgroundColor = 'var(--fd-layout-background)',
		class: customClass = '',
		header,
		leftSidebar,
		rightSidebar,
		bottomPanel,
		footer,
		children
	}: Props = $props();

	/** Current width of the left sidebar */
	let leftSidebarWidth = $state(initialLeftWidth);

	/** Current width of the right sidebar */
	let rightSidebarWidth = $state(initialRightWidth);

	/** Current height of the bottom panel */
	let bottomPanelHeightState = $state(initialBottomHeight);

	/**
	 * Sync left sidebar width with prop changes
	 * This allows external control (e.g., collapsed state) to update the width
	 */
	$effect(() => {
		leftSidebarWidth = initialLeftWidth;
	});

	/** Whether the user is currently dragging the left divider */
	let isDraggingLeft = $state(false);

	/** Whether the user is currently dragging the right divider */
	let isDraggingRight = $state(false);

	/** Whether the user is currently dragging the bottom divider */
	let isDraggingBottom = $state(false);

	/** Reference to the layout container element */
	let layoutRef: HTMLDivElement | null = null;

	/** Reference to the main content wrapper for bottom panel calculations */
	let mainContentRef: HTMLDivElement | null = null;

	/**
	 * Handles the start of a drag operation on the left divider
	 * @param event - The mouse event that triggered the drag
	 */
	function handleLeftDragStart(event: MouseEvent): void {
		if (!enableLeftSplitPane) return;
		event.preventDefault();
		isDraggingLeft = true;
	}

	/**
	 * Handles the start of a drag operation on the right divider
	 * @param event - The mouse event that triggered the drag
	 */
	function handleRightDragStart(event: MouseEvent): void {
		if (!enableRightSplitPane) return;
		event.preventDefault();
		isDraggingRight = true;
	}

	/**
	 * Handles the start of a drag operation on the bottom divider
	 * @param event - The mouse event that triggered the drag
	 */
	function handleBottomDragStart(event: MouseEvent): void {
		if (!enableBottomSplitPane) return;
		event.preventDefault();
		isDraggingBottom = true;
	}

	/**
	 * Handles mouse movement during drag operations
	 * Updates sidebar widths and bottom panel height based on mouse position
	 * @param event - The mouse event during drag
	 */
	function handleMouseMove(event: MouseEvent): void {
		if (!layoutRef) return;

		const layoutRect = layoutRef.getBoundingClientRect();

		if (isDraggingLeft) {
			// Calculate new width from the left edge of the layout
			const newWidth = event.clientX - layoutRect.left;
			// Clamp the width between min and max values
			leftSidebarWidth = Math.min(Math.max(newWidth, leftSidebarMinWidth), leftSidebarMaxWidth);
		}

		if (isDraggingRight) {
			// Calculate new width from the right edge of the layout
			const newWidth = layoutRect.right - event.clientX;
			// Clamp the width between min and max values
			rightSidebarWidth = Math.min(Math.max(newWidth, rightSidebarMinWidth), rightSidebarMaxWidth);
		}

		if (isDraggingBottom && mainContentRef) {
			// Calculate new height from the bottom of the main content area
			const mainRect = mainContentRef.getBoundingClientRect();
			const newHeight = mainRect.bottom - event.clientY;
			// Clamp the height between min and max values
			bottomPanelHeightState = Math.min(
				Math.max(newHeight, bottomPanelMinHeight),
				bottomPanelMaxHeight
			);
		}
	}

	/**
	 * Handles the end of a drag operation
	 * Resets dragging state for all dividers
	 */
	function handleMouseUp(): void {
		isDraggingLeft = false;
		isDraggingRight = false;
		isDraggingBottom = false;
	}

	/**
	 * Handles keyboard navigation for accessibility
	 * Allows resizing with arrow keys when divider is focused
	 * @param event - The keyboard event
	 * @param side - Which divider is being adjusted
	 */
	function handleKeyDown(event: KeyboardEvent, side: 'left' | 'right' | 'bottom'): void {
		// Check if the specific side's split pane is enabled
		if (side === 'left' && !enableLeftSplitPane) return;
		if (side === 'right' && !enableRightSplitPane) return;
		if (side === 'bottom' && !enableBottomSplitPane) return;

		const step = event.shiftKey ? 50 : 10;

		if (side === 'left') {
			if (event.key === 'ArrowRight') {
				event.preventDefault();
				leftSidebarWidth = Math.min(leftSidebarWidth + step, leftSidebarMaxWidth);
			} else if (event.key === 'ArrowLeft') {
				event.preventDefault();
				leftSidebarWidth = Math.max(leftSidebarWidth - step, leftSidebarMinWidth);
			}
		} else if (side === 'right') {
			if (event.key === 'ArrowLeft') {
				event.preventDefault();
				rightSidebarWidth = Math.min(rightSidebarWidth + step, rightSidebarMaxWidth);
			} else if (event.key === 'ArrowRight') {
				event.preventDefault();
				rightSidebarWidth = Math.max(rightSidebarWidth - step, rightSidebarMinWidth);
			}
		} else if (side === 'bottom') {
			if (event.key === 'ArrowUp') {
				event.preventDefault();
				bottomPanelHeightState = Math.min(bottomPanelHeightState + step, bottomPanelMaxHeight);
			} else if (event.key === 'ArrowDown') {
				event.preventDefault();
				bottomPanelHeightState = Math.max(bottomPanelHeightState - step, bottomPanelMinHeight);
			}
		}
	}

	// Set up global mouse event listeners for drag operations
	onMount(() => {
		/**
		 * Global mouse move handler for tracking drag operations
		 */
		const mouseMoveHandler = (e: MouseEvent) => {
			if (isDraggingLeft || isDraggingRight || isDraggingBottom) {
				handleMouseMove(e);
			}
		};

		/**
		 * Global mouse up handler to end drag operations
		 */
		const mouseUpHandler = () => {
			handleMouseUp();
		};

		// Attach event listeners to window for drag tracking
		window.addEventListener('mousemove', mouseMoveHandler);
		window.addEventListener('mouseup', mouseUpHandler);

		// Cleanup on component unmount
		return () => {
			window.removeEventListener('mousemove', mouseMoveHandler);
			window.removeEventListener('mouseup', mouseUpHandler);
		};
	});

	/** Computed CSS variable for header height */
	const headerHeightVar = $derived(`${headerHeight}px`);

	/** Computed CSS variable for footer height */
	const footerHeightVar = $derived(`${footerHeight}px`);

	/** Computed CSS variable for left sidebar width */
	const leftWidthVar = $derived(`${leftSidebarWidth}px`);

	/** Computed CSS variable for right sidebar width */
	const rightWidthVar = $derived(`${rightSidebarWidth}px`);

	/** Computed CSS variable for bottom panel height */
	const bottomHeightVar = $derived(`${bottomPanelHeightState}px`);
</script>

<div
	bind:this={layoutRef}
	class="flowdrop-main-layout {customClass}"
	class:flowdrop-main-layout--dragging={isDraggingLeft || isDraggingRight || isDraggingBottom}
	class:flowdrop-main-layout--dragging-vertical={isDraggingBottom}
	style="
		--layout-header-height: {headerHeightVar};
		--layout-footer-height: {footerHeightVar};
		--layout-left-sidebar-width: {leftWidthVar};
		--layout-right-sidebar-width: {rightWidthVar};
		--layout-bottom-panel-height: {bottomHeightVar};
		--layout-background: {backgroundColor};
	"
>
	<!-- Header Section -->
	{#if showHeader && header}
		<header class="flowdrop-main-layout__header">
			{@render header()}
		</header>
	{/if}

	<!-- Main Content Area -->
	<div class="flowdrop-main-layout__body">
		<!-- Left Sidebar -->
		{#if showLeftSidebar && leftSidebar}
			<aside class="flowdrop-main-layout__sidebar flowdrop-main-layout__sidebar--left">
				{@render leftSidebar()}
			</aside>

			<!-- Left Divider (Resizable Handle) -->
			{#if enableLeftSplitPane}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<div
					class="flowdrop-main-layout__divider flowdrop-main-layout__divider--left"
					class:flowdrop-main-layout__divider--active={isDraggingLeft}
					onmousedown={handleLeftDragStart}
					onkeydown={(e) => handleKeyDown(e, 'left')}
					role="separator"
					aria-orientation="vertical"
					aria-valuenow={leftSidebarWidth}
					aria-valuemin={leftSidebarMinWidth}
					aria-valuemax={leftSidebarMaxWidth}
					aria-label="Resize left sidebar"
					tabindex="0"
				>
					<div class="flowdrop-main-layout__divider-handle"></div>
				</div>
			{/if}
		{/if}

		<!-- Center Main Content Wrapper (with optional bottom panel) -->
		<div
			bind:this={mainContentRef}
			class="flowdrop-main-layout__main-wrapper"
			class:flowdrop-main-layout__main-wrapper--with-bottom={showBottomPanel && bottomPanel}
		>
			<!-- Main Content Area -->
			<main class="flowdrop-main-layout__main">
				{#if children}
					{@render children()}
				{/if}
			</main>

			<!-- Bottom Panel Divider -->
			{#if showBottomPanel && bottomPanel && enableBottomSplitPane}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<div
					class="flowdrop-main-layout__divider flowdrop-main-layout__divider--bottom"
					class:flowdrop-main-layout__divider--active={isDraggingBottom}
					onmousedown={handleBottomDragStart}
					onkeydown={(e) => handleKeyDown(e, 'bottom')}
					role="separator"
					aria-orientation="horizontal"
					aria-valuenow={bottomPanelHeightState}
					aria-valuemin={bottomPanelMinHeight}
					aria-valuemax={bottomPanelMaxHeight}
					aria-label="Resize bottom panel"
					tabindex="0"
				>
					<div
						class="flowdrop-main-layout__divider-handle flowdrop-main-layout__divider-handle--horizontal"
					></div>
				</div>
			{/if}

			<!-- Bottom Panel -->
			{#if showBottomPanel && bottomPanel}
				<aside class="flowdrop-main-layout__panel flowdrop-main-layout__panel--bottom">
					{@render bottomPanel()}
				</aside>
			{/if}
		</div>

		<!-- Right Divider (Resizable Handle) -->
		{#if showRightSidebar && rightSidebar && enableRightSplitPane}
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<div
				class="flowdrop-main-layout__divider flowdrop-main-layout__divider--right"
				class:flowdrop-main-layout__divider--active={isDraggingRight}
				onmousedown={handleRightDragStart}
				onkeydown={(e) => handleKeyDown(e, 'right')}
				role="separator"
				aria-orientation="vertical"
				aria-valuenow={rightSidebarWidth}
				aria-valuemin={rightSidebarMinWidth}
				aria-valuemax={rightSidebarMaxWidth}
				aria-label="Resize right sidebar"
				tabindex="0"
			>
				<div class="flowdrop-main-layout__divider-handle"></div>
			</div>
		{/if}

		<!-- Right Sidebar -->
		{#if showRightSidebar && rightSidebar}
			<aside class="flowdrop-main-layout__sidebar flowdrop-main-layout__sidebar--right">
				{@render rightSidebar()}
			</aside>
		{/if}
	</div>

	<!-- Footer Section -->
	{#if showFooter && footer}
		<footer class="flowdrop-main-layout__footer">
			{@render footer()}
		</footer>
	{/if}
</div>

<style>
	/* Main Layout Container */
	.flowdrop-main-layout {
		display: flex;
		flex-direction: column;
		height: 100vh;
		width: 100%;
		background: var(
			--fd-layout-background,
			linear-gradient(135deg, #f9fafb 0%, #e0e7ff 50%, #c7d2fe 100%)
		);
		overflow: hidden;
	}

	/* Dark mode override for layout background */
	:global([data-theme='dark']) :global(.flowdrop-main-layout) {
		background: linear-gradient(135deg, #141418 0%, #1a1a2e 50%, #16162a 100%);
	}

	/* Disable text selection and pointer events during drag */
	.flowdrop-main-layout--dragging {
		user-select: none;
		cursor: col-resize;
	}

	.flowdrop-main-layout--dragging * {
		pointer-events: none;
	}

	.flowdrop-main-layout--dragging .flowdrop-main-layout__divider {
		pointer-events: auto;
	}

	/* Header Section */
	.flowdrop-main-layout__header {
		height: var(--layout-header-height);
		min-height: var(--layout-header-height);
		max-height: var(--layout-header-height);
		width: 100%;
		background-color: var(--fd-background);
		border-bottom: 1px solid var(--fd-border);
		display: flex;
		align-items: center;
		z-index: 100;
	}

	/* Main Body Container */
	.flowdrop-main-layout__body {
		flex: 1;
		display: flex;
		min-height: 0;
		overflow: hidden;
		position: relative;
	}

	/* Sidebar Base Styles */
	.flowdrop-main-layout__sidebar {
		height: 100%;
		background-color: var(--fd-background);
		overflow-y: auto;
		overflow-x: hidden;
		display: flex;
		flex-direction: column;
		z-index: 10;

		/* Custom scrollbar styling */
		scrollbar-width: thin;
		scrollbar-color: var(--fd-scrollbar-thumb) var(--fd-scrollbar-track);
	}

	.flowdrop-main-layout__sidebar::-webkit-scrollbar {
		width: 8px;
	}

	.flowdrop-main-layout__sidebar::-webkit-scrollbar-track {
		background: var(--fd-scrollbar-track);
		border-radius: 4px;
	}

	.flowdrop-main-layout__sidebar::-webkit-scrollbar-thumb {
		background: var(--fd-scrollbar-thumb);
		border-radius: 4px;
	}

	.flowdrop-main-layout__sidebar::-webkit-scrollbar-thumb:hover {
		background: var(--fd-scrollbar-thumb-hover);
	}

	/* Left Sidebar */
	.flowdrop-main-layout__sidebar--left {
		width: var(--layout-left-sidebar-width);
		min-width: var(--layout-left-sidebar-width);
		border-right: 1px solid var(--fd-border);
		box-shadow: 2px 0 4px rgba(0, 0, 0, 0.05);
	}

	/* Right Sidebar */
	.flowdrop-main-layout__sidebar--right {
		width: var(--layout-right-sidebar-width);
		min-width: var(--layout-right-sidebar-width);
	}

	/* Main Content Wrapper - Contains main content and optional bottom panel */
	.flowdrop-main-layout__main-wrapper {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		position: relative;
		overflow: hidden;
	}

	/* Main Content Area */
	.flowdrop-main-layout__main {
		flex: 1;
		min-width: 0;
		min-height: 0;
		overflow: auto;
		position: relative;
		display: flex;
		flex-direction: column;
	}

	/* When bottom panel is shown, main area should shrink */
	.flowdrop-main-layout__main-wrapper--with-bottom .flowdrop-main-layout__main {
		height: calc(100% - var(--layout-bottom-panel-height) - 8px);
	}

	/* Divider (Resize Handle) Base Styles */
	.flowdrop-main-layout__divider {
		width: 8px;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: col-resize;
		background-color: var(--fd-background);
		position: relative;
		z-index: 20;
		flex-shrink: 0;
		transition: background-color 0.2s ease;
		border-right: 1px solid var(--fd-border);
		border-left: 1px solid var(--fd-border);
	}

	.flowdrop-main-layout__divider:hover,
	.flowdrop-main-layout__divider:focus {
		background-color: var(--fd-primary-muted);
	}

	.flowdrop-main-layout__divider:focus {
		outline: none;
		background-color: var(--fd-primary-muted);
	}

	.flowdrop-main-layout__divider--active {
		background-color: var(--fd-primary-muted);
	}

	/* Divider Handle (Visual Indicator) */
	.flowdrop-main-layout__divider-handle {
		width: 4px;
		height: 48px;
		background-color: var(--fd-border-strong);
		border-radius: 4px;
		transition:
			background-color 0.2s ease,
			transform 0.2s ease;
	}

	.flowdrop-main-layout__divider:hover .flowdrop-main-layout__divider-handle,
	.flowdrop-main-layout__divider:focus .flowdrop-main-layout__divider-handle {
		background-color: var(--fd-primary);
		transform: scaleY(1.2);
	}

	.flowdrop-main-layout__divider--active .flowdrop-main-layout__divider-handle {
		background-color: var(--fd-primary-hover);
		transform: scaleY(1.4);
	}

	/* Bottom Divider (Horizontal) */
	.flowdrop-main-layout__divider--bottom {
		width: 100%;
		height: 8px;
		cursor: row-resize;
		flex-shrink: 0;
		border-top: 1px solid var(--fd-border);
		border-bottom: 1px solid var(--fd-border);
		border-left: none;
		border-right: none;
	}

	/* Horizontal Divider Handle */
	.flowdrop-main-layout__divider-handle--horizontal {
		width: 48px;
		height: 4px;
	}

	.flowdrop-main-layout__divider--bottom:hover .flowdrop-main-layout__divider-handle--horizontal,
	.flowdrop-main-layout__divider--bottom:focus .flowdrop-main-layout__divider-handle--horizontal {
		transform: scaleX(1.2);
	}

	.flowdrop-main-layout__divider--bottom.flowdrop-main-layout__divider--active
		.flowdrop-main-layout__divider-handle--horizontal {
		transform: scaleX(1.4);
	}

	/* Bottom Panel Styles */
	.flowdrop-main-layout__panel--bottom {
		height: var(--layout-bottom-panel-height);
		min-height: var(--layout-bottom-panel-height);
		max-height: var(--layout-bottom-panel-height);
		width: 100%;
		background-color: var(--fd-background);
		overflow-y: auto;
		overflow-x: hidden;
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		border-top: 1px solid var(--fd-border);
		box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.05);

		/* Custom scrollbar styling */
		scrollbar-width: thin;
		scrollbar-color: var(--fd-scrollbar-thumb) var(--fd-scrollbar-track);
	}

	.flowdrop-main-layout__panel--bottom::-webkit-scrollbar {
		width: 8px;
	}

	.flowdrop-main-layout__panel--bottom::-webkit-scrollbar-track {
		background: var(--fd-scrollbar-track);
		border-radius: 4px;
	}

	.flowdrop-main-layout__panel--bottom::-webkit-scrollbar-thumb {
		background: var(--fd-scrollbar-thumb);
		border-radius: 4px;
	}

	.flowdrop-main-layout__panel--bottom::-webkit-scrollbar-thumb:hover {
		background: var(--fd-scrollbar-thumb-hover);
	}

	/* Vertical dragging cursor override */
	.flowdrop-main-layout--dragging-vertical {
		cursor: row-resize;
	}

	/* Footer Section */
	.flowdrop-main-layout__footer {
		height: var(--layout-footer-height);
		min-height: var(--layout-footer-height);
		max-height: var(--layout-footer-height);
		width: 100%;
		background-color: var(--fd-background);
		border-top: 1px solid var(--fd-border);
		display: flex;
		align-items: center;
		z-index: 100;
		box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.05);
	}

	/* Responsive Adjustments */
	@media (max-width: 768px) {
		.flowdrop-main-layout__sidebar--left,
		.flowdrop-main-layout__sidebar--right {
			position: absolute;
			top: 0;
			bottom: 0;
			z-index: 50;
		}

		.flowdrop-main-layout__sidebar--left {
			left: 0;
		}

		.flowdrop-main-layout__sidebar--right {
			right: 0;
		}
	}
</style>
