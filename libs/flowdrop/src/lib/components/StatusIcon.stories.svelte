<script module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import StatusIcon from "./StatusIcon.svelte";

	const { Story } = defineMeta({
		title: "Display/StatusIcon",
		component: StatusIcon,
		tags: ["autodocs"],
		argTypes: {
			status: {
				control: { type: "select" },
				options: ["idle", "pending", "running", "completed", "failed", "cancelled", "skipped"],
			},
			size: {
				control: { type: "select" },
				options: ["sm", "md", "lg", "xl"],
			},
			showBackground: { control: "boolean" },
		},
	});
</script>

<Story name="Idle" args={{ status: "idle" }} />

<Story name="Running" args={{ status: "running" }} />

<Story name="Completed" args={{ status: "completed" }} />

<Story name="Failed" args={{ status: "failed" }} />

<Story name="With Background" args={{ status: "completed", showBackground: true }} />

<Story name="All Statuses">
	<div style="display: flex; gap: 1rem; align-items: center;">
		<StatusIcon status="idle" />
		<StatusIcon status="pending" />
		<StatusIcon status="running" />
		<StatusIcon status="completed" />
		<StatusIcon status="failed" />
		<StatusIcon status="cancelled" />
		<StatusIcon status="skipped" />
	</div>
</Story>
