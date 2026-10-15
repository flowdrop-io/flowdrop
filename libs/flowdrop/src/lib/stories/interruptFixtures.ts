/**
 * Typed interrupt fixtures for the Playground prompt stories, and a seeder that
 * puts one into an instance's interrupt store in a given state.
 *
 * Use with `InstanceDecorator`: `setup={(fd) => seedInterrupt(fd, confirmation())}`.
 */

import type { FlowDropInstance } from '../stores/instanceContainer.svelte.js';
import type {
  ChoiceConfig,
  ConfirmationConfig,
  FormConfig,
  Interrupt,
  InterruptConfig,
  InterruptType,
  ReviewConfig,
  TextConfig
} from '../types/interrupt.js';
import {
  createChoiceConfig,
  createConfirmationConfig,
  createReviewConfig,
  createTextConfig
} from './utils.js';

function make(
  type: InterruptType,
  config: InterruptConfig & { message: string },
  overrides: Partial<Interrupt> = {}
): Interrupt {
  return {
    id: `int-${type}`,
    type,
    status: 'pending',
    message: config.message,
    createdAt: '2026-10-12T14:30:00Z',
    allowCancel: type !== 'confirmation',
    config,
    ...overrides
  };
}

export const confirmation = (config?: Partial<ConfirmationConfig>, o?: Partial<Interrupt>) =>
  make(
    'confirmation',
    createConfirmationConfig({
      message: 'Send this reply to the customer?',
      confirmLabel: 'Send',
      cancelLabel: 'Do not send',
      ...config
    }),
    o
  );

export const choice = (config?: Partial<ChoiceConfig>, o?: Partial<Interrupt>) =>
  make('choice', createChoiceConfig(config), o);

export const text = (config?: Partial<TextConfig>, o?: Partial<Interrupt>) =>
  make('text', createTextConfig(config), o);

export const review = (config?: Partial<ReviewConfig>, o?: Partial<Interrupt>) =>
  make('review', createReviewConfig(config), o);

export const formConfig: FormConfig = {
  message: 'Tell us where to ship the order',
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Name' },
      street: { type: 'string', title: 'Street' },
      express: { type: 'boolean', title: 'Express delivery', default: false }
    },
    required: ['name', 'street']
  },
  defaultValues: { name: 'Alex Rivera' }
};

export const form = (config?: Partial<FormConfig>, o?: Partial<Interrupt>) =>
  make('form', { ...formConfig, ...config }, o);

export type SeedState =
  | { state: 'waiting' }
  | { state: 'submitting'; value: unknown }
  | { state: 'answered'; value: unknown }
  | { state: 'cancelled' }
  | { state: 'error'; value: unknown; message: string };

/** Add the interrupt to the instance and move it to `seed` (default: waiting for the person). */
export function seedInterrupt(
  fd: FlowDropInstance,
  interrupt: Interrupt,
  seed: SeedState = { state: 'waiting' }
): void {
  fd.interrupts.addInterrupt(interrupt);
  const id = interrupt.id;
  switch (seed.state) {
    case 'waiting':
      break;
    case 'submitting':
      fd.interrupts.startSubmit(id, seed.value);
      break;
    case 'answered':
      fd.interrupts.startSubmit(id, seed.value);
      fd.interrupts.submitSuccess(id);
      break;
    case 'cancelled':
      fd.interrupts.startCancel(id);
      fd.interrupts.submitSuccess(id);
      break;
    case 'error':
      fd.interrupts.startSubmit(id, seed.value);
      fd.interrupts.submitFailure(id, seed.message);
      break;
  }
}
