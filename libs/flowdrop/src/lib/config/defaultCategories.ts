/**
 * Default category definitions for FlowDrop
 * Provides built-in categories with icons, colors, and display labels.
 * These serve as fallbacks when the /categories API endpoint is unavailable.
 */

import type { CategoryDefinition } from "../types/index.js";

export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  {
    name: "triggers",
    label: "Triggers",
    icon: "mdi:lightning-bolt",
    color: "var(--fd-node-cyan)",
    weight: 0,
  },
  {
    name: "inputs",
    label: "Inputs",
    icon: "mdi:arrow-down-circle",
    color: "var(--fd-node-emerald)",
    weight: 1,
  },
  {
    name: "outputs",
    label: "Outputs",
    icon: "mdi:arrow-up-circle",
    color: "var(--fd-node-blue)",
    weight: 2,
  },
  {
    name: "prompts",
    label: "Prompts",
    icon: "mdi:message-text",
    color: "var(--fd-node-amber)",
    weight: 3,
  },
  {
    name: "models",
    label: "Models",
    icon: "mdi:robot",
    color: "var(--fd-node-indigo)",
    weight: 4,
  },
  {
    name: "processing",
    label: "Processing",
    icon: "mdi:cog",
    color: "var(--fd-node-teal)",
    weight: 5,
  },
  {
    name: "logic",
    label: "Logic",
    icon: "mdi:source-branch",
    color: "var(--fd-node-purple)",
    weight: 6,
  },
  {
    name: "data",
    label: "Data",
    icon: "mdi:database",
    color: "var(--fd-node-orange)",
    weight: 7,
  },
  {
    name: "tools",
    label: "Tools",
    icon: "mdi:wrench",
    color: "var(--fd-node-amber)",
    weight: 8,
  },
  {
    name: "helpers",
    label: "Helpers",
    icon: "mdi:help-circle",
    color: "var(--fd-node-slate)",
    weight: 9,
  },
  {
    name: "vector stores",
    label: "Vector Stores",
    icon: "mdi:vector-square",
    color: "var(--fd-node-emerald)",
    weight: 10,
  },
  {
    name: "embeddings",
    label: "Embeddings",
    icon: "mdi:vector-polygon",
    color: "var(--fd-node-indigo)",
    weight: 11,
  },
  {
    name: "memories",
    label: "Memories",
    icon: "mdi:brain",
    color: "var(--fd-node-blue)",
    weight: 12,
  },
  {
    name: "agents",
    label: "Agents",
    icon: "mdi:account-cog",
    color: "var(--fd-node-teal)",
    weight: 13,
  },
  {
    name: "ai",
    label: "AI",
    icon: "mdi:shimmer",
    color: "var(--fd-node-purple)",
    weight: 14,
  },
  {
    name: "interrupts",
    label: "Interrupts",
    icon: "mdi:hand-back-left",
    color: "var(--fd-node-red)",
    weight: 15,
  },
  {
    name: "bundles",
    label: "Bundles",
    icon: "mdi:package-variant",
    color: "var(--fd-node-slate)",
    weight: 16,
  },
];
