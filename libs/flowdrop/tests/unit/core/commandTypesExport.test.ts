/** The `./core` entry names the command and result types a custom `CommandDispatch` or host needs (checked by svelte-check). */

import { describe, it, expect } from 'vitest';
import type {
  InterfaceInputEdit,
  InterfaceSetCommand,
  InterfaceExposeCommand,
  InterfaceListResultData,
  PortsListResultData,
  PlaygroundChatCommand,
  PlaygroundChatEdit,
  WorkflowGetResultData,
  BeautifyLayoutCommand,
  LayoutResultData,
  CommandDispatch
} from '../../../src/lib/core/index.js';

describe('./core entry', () => {
  it('exports the interface edit and the newer command and result types', () => {
    const edit: InterfaceInputEdit = { kind: 'remove', id: 'q' } as InterfaceInputEdit;
    const dispatch: Pick<CommandDispatch, 'editInterface'> | null = null;
    const names: Array<
      | InterfaceSetCommand
      | InterfaceExposeCommand
      | InterfaceListResultData
      | PortsListResultData
      | PlaygroundChatCommand
      | PlaygroundChatEdit
      | WorkflowGetResultData
      | BeautifyLayoutCommand
      | LayoutResultData
    > = [];
    expect(edit).toBeDefined();
    expect(dispatch).toBeNull();
    expect(names).toEqual([]);
  });
});
