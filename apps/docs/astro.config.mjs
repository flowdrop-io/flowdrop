// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import svelte from '@astrojs/svelte';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'FlowDrop',
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/flowdrop-io/flowdrop'
				}
			],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Installation', slug: 'getting-started/installation' },
						{ label: 'Quick Start', slug: 'getting-started/quick-start' }
					]
				},
				{
					label: 'Guides',
					autogenerate: { directory: 'guides' }
				},
				{
					label: 'Reference',
					autogenerate: { directory: 'reference' }
				}
			]
		}),
		svelte()
	]
});
