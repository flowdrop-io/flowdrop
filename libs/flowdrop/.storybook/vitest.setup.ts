import { setProjectAnnotations } from '@storybook/sveltekit';
import * as previewAnnotations from './preview';

// Apply the Storybook preview (decorators, parameters, global CSS) to the
// stories when they run as vitest browser tests.
setProjectAnnotations([previewAnnotations]);
