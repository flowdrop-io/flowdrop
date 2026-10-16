/**
 * Which node, if any, a Playground message can link to.
 *
 * The server names the node a message came from in `message.nodeId`. The link
 * is only real when that node is on the canvas now, so a node deleted since the
 * run leaves a plain label, never a link that goes nowhere. A message from a
 * sub-workflow (`parentPipelineId` set) names a node of the *child* workflow,
 * which this canvas does not show, so it never links either.
 */

export interface LinkableMessage {
  nodeId?: string | null;
  parentPipelineId?: string | null;
}

/** The node id to link to, or `null` when the message should render plain. */
export function resolveMessageNodeLink(
  message: LinkableMessage,
  nodes: readonly { id: string }[] | undefined | null
): string | null {
  const id = message.nodeId;
  if (!id || message.parentPipelineId) return null;
  return nodes?.some((node) => node.id === id) ? id : null;
}
