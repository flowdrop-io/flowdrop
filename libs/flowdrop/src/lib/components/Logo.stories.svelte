<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Logo from './Logo.svelte';

	const { Story } = defineMeta({
		title: 'Display/Logo',
		component: Logo,
		tags: ['autodocs']
	});
</script>

<Story name="Default">
	<div style="width: 64px; height: 64px;">
		<Logo />
	</div>
</Story>

<Story name="Large">
	<div style="width: 128px; height: 128px;">
		<Logo />
	</div>
</Story>
