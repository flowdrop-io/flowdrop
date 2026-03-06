<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ConfirmationPrompt from './ConfirmationPrompt.svelte';
	import { fn } from 'storybook/test';
	import { createConfirmationConfig } from '../../stories/utils.js';

	const { Story } = defineMeta({
		title: 'Interrupt/ConfirmationPrompt',
		component: ConfirmationPrompt,
		tags: ['autodocs'],
		args: {
			config: createConfirmationConfig(),
			isResolved: false,
			isSubmitting: false,
			onConfirm: fn(),
			onDecline: fn()
		}
	});
</script>

<Story name="Pending" />

<Story
	name="Custom Labels"
	args={{
		config: createConfirmationConfig({
			message: 'Deploy to production?',
			confirmLabel: 'Deploy',
			cancelLabel: 'Abort'
		})
	}}
/>

<Story
	name="Confirmed"
	args={{
		isResolved: true,
		resolvedValue: true
	}}
/>

<Story
	name="Declined"
	args={{
		isResolved: true,
		resolvedValue: false
	}}
/>

<Story
	name="Submitting"
	args={{
		isSubmitting: true
	}}
/>

<Story
	name="With Error"
	args={{
		error: 'Network error: Failed to submit response'
	}}
/>

<Story
	name="Resolved By User"
	args={{
		isResolved: true,
		resolvedValue: true,
		resolvedByUserName: 'Alice'
	}}
/>
