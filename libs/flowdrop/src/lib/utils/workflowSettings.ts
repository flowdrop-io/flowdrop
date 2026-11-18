/**
 * The Workflow Settings form's config, split into what `batchUpdate` takes.
 */

/** What the settings form reports, split for `WorkflowStore.batchUpdate`. */
export interface WorkflowSettingsUpdate {
  name: string | undefined;
  description: string;
  /** Every other key: it belongs in `workflow.config`. */
  customConfig: Record<string, unknown>;
}

/**
 * A cleared field leaves its key out of the config the form reports, and
 * `batchUpdate` leaves a description it is not given as it was. So an absent
 * `description` is sent as `''`: the person emptied it, and the old text must
 * not come back. (`name` is required, and `batchUpdate` ignores an empty one.)
 */
export function splitWorkflowSettings(config: Record<string, unknown>): WorkflowSettingsUpdate {
  const { name, description, format: _format, ...customConfig } = config;
  return {
    name: name as string | undefined,
    description: typeof description === 'string' ? description : '',
    customConfig
  };
}
