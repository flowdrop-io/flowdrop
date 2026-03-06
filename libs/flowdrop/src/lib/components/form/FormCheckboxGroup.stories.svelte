<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import FormCheckboxGroup from './FormCheckboxGroup.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'Form/FormCheckboxGroup',
		component: FormCheckboxGroup,
		tags: ['autodocs'],
		argTypes: {
			disabled: { control: 'boolean' }
		},
		args: {
			id: 'demo-checkbox-group',
			options: ['Email', 'SMS', 'Push Notification', 'Webhook'],
			value: [],
			onChange: fn()
		}
	});
</script>

<Story name="No Selection" args={{ value: [] }} />

<Story name="Pre-selected" args={{ value: ['Email', 'Push Notification'] }} />

<Story name="All Selected" args={{ value: ['Email', 'SMS', 'Push Notification', 'Webhook'] }} />

<Story name="Disabled" args={{ value: ['Email'], disabled: true }} />
