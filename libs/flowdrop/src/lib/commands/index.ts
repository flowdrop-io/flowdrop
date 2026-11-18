/**
 * FlowDrop Command DSL
 *
 * A deterministic command language for programmatic workflow manipulation.
 * Excludes storeIntegration.svelte.ts (Svelte-coupled, import separately).
 *
 * @module commands
 */

// Types
export type {
  AddNodeCommand,
  DeleteNodeCommand,
  RenameNodeCommand,
  SetConfigCommand,
  GetConfigCommand,
  ConnectCommand,
  DisconnectPortsCommand,
  DisconnectNodeCommand,
  ListNodesCommand,
  ListEdgesCommand,
  ListTypesCommand,
  DescribeTypeCommand,
  SearchTypesCommand,
  InfoCommand,
  UndoCommand,
  RedoCommand,
  ConfigOpenCommand,
  SelectNodeCommand,
  HelpCommand,
  ClearCommand,
  SwapNodeCommand,
  MoveNodeCommand,
  AutoLayoutCommand,
  BeautifyLayoutCommand,
  InspectNodeLayoutCommand,
  BeautifyNodeCommand,
  BeautifyNodeStrategy,
  CanvasFitViewCommand,
  CanvasZoomInCommand,
  CanvasZoomOutCommand,
  CanvasZoomToCommand,
  CanvasPanToCommand,
  CanvasResetViewCommand,
  InterfaceSide,
  InterfaceField,
  InterfaceListCommand,
  InterfaceExposeCommand,
  InterfaceAddCommand,
  InterfaceRemoveCommand,
  InterfaceRenameCommand,
  InterfaceBindCommand,
  InterfaceSetCommand,
  InterfacePullCommand,
  InterfaceMoveCommand,
  PortsListCommand,
  PortsExposureCommand,
  PortsMoveCommand,
  DuplicateNodeCommand,
  WorkflowGetCommand,
  WorkflowSetCommand,
  PlaygroundGetCommand,
  PlaygroundChatEdit,
  PlaygroundChatCommand,
  InterfaceEntryDescription,
  InterfaceListResultData,
  PortStateDescription,
  PortsListResultData,
  DuplicateNodeResultData,
  WorkflowGetResultData,
  PlaygroundGetResultData,
  Command,
  ParseResult,
  CommandErrorCode,
  AddNodeResultData,
  ListNodesResultData,
  ListEdgesResultData,
  ListTypesResultData,
  SearchTypesResultData,
  DescribeTypeResultData,
  TypeSummary,
  ConfigKeyDescription,
  PortDescription,
  InfoResultData,
  GetConfigResultData,
  GetConfigKeyResultData,
  GetConfigAllResultData,
  SetConfigResultData,
  HelpResultData,
  SwapNodeResultData,
  CommandResultData,
  CommandResultOk,
  CommandResultError,
  CommandResult,
  BatchResult,
  UIAction,
  CommandDispatch,
  CommandContext
} from './types.js';

export { buildTypeMap } from './types.js';

// Parser
export { parseCommand } from './parser.js';

// Executor
export { executeCommand, toShortId, toShortTypeId, resolveNode, COMMAND_HELP } from './executor.js';

// The editor Console's own commands: session, mode, runs, save, export
// (editor Console only; not part of the Command union)
export {
  parseConsoleLine,
  executeConsoleCommand,
  runConsoleLine,
  isConsoleLine,
  consoleHelp,
  consoleRefusal,
  testModeBlocker,
  CONSOLE_HELP,
  CONSOLE_VERBS,
  type ConsoleCommand,
  type ConsoleParseResult,
  type ConsoleHost,
  type ConsoleInstance,
  type ConsoleHelpRow,
  type SessionCommand,
  type EditorCommand
} from './console.js';

// Batch executor
export { executeBatch } from './batch.js';

// Positioner
export { computeAutoPosition } from './positioner.js';
