import type { Preview } from '@storybook/sveltekit';
import './storybook.css';

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			}
		},
		layout: 'centered'
	}
};

export default preview;
