import type { Preview } from '@storybook/sveltekit';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
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
	},
	decorators: [
		withThemeByDataAttribute({
			themes: {
				light: 'light',
				dark: 'dark'
			},
			defaultTheme: 'light',
			attributeName: 'data-theme'
		})
	]
};

export default preview;
