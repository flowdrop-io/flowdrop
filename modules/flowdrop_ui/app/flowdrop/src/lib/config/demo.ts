/**
 * Demo configuration for FlowDrop UI
 * Controls which nodes and workflows are shown in demo mode
 */

import type { DemoConfig } from "../data/samples.js";

/**
 * Default demo configuration
 * Change this to enable/disable demo mode and control what's shown
 */
export const defaultDemoConfig: DemoConfig = {
  enabled: true, // Set to true to enable demo mode
  mode: "content-management" // Show only whitelisted content management nodes
};

/**
 * Demo mode presets for different scenarios
 */
export const demoPresets: Record<string, DemoConfig> = {
  // Content management demo mode - show only whitelisted nodes
  "content-management": {
    enabled: true,
    mode: "content-management"
  },
  
  // Show all nodes (disable demo filtering)
  "all-nodes": {
    enabled: false,
    mode: "all"
  }
};

/**
 * Get the current demo configuration
 * You can modify this function to read from localStorage, URL params, etc.
 */
export function getCurrentDemoConfig(): DemoConfig {
  // For now, return the default config
  // In the future, this could check localStorage or URL parameters
  return defaultDemoConfig;
}

/**
 * Set demo configuration (for future use with UI controls)
 */
export function setDemoConfig(config: DemoConfig): void {
  // Store in localStorage for persistence
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("flowdrop-demo-config", JSON.stringify(config));
  }
}

/**
 * Load demo configuration from localStorage
 */
export function loadDemoConfig(): DemoConfig {
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem("flowdrop-demo-config");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Fall back to default if parsing fails
        return defaultDemoConfig;
      }
    }
  }
  return defaultDemoConfig;
}

/**
 * Demo workflow configuration
 */
export const demoWorkflowConfig = {
  // Which workflow to show by default in demo mode
  defaultWorkflow: "sample", // Use sample workflow for now
  
  // Whether to auto-load a workflow on startup
  autoLoadDemo: false,
  
  // Sample workflow is used in demo mode
  sampleWorkflowName: "Simple Chat Workflow",
  sampleWorkflowDescription: "A basic workflow demonstrating direct text input to AI model response"
};

/**
 * Demo instructions for non-technical users
 */
export const demoInstructions = {
  title: "Multi-Agent Content Management Demo",
  description: "This demo shows how FlowDrop uses multiple AI agents working together to manage and improve your Drupal content.",
  
  steps: [
    {
      step: 1,
      title: "User Input",
      description: "Start by telling the main agent what content management task you need.",
      example: "Find all blog posts about 'XB' and check if it's being used correctly as an acronym"
    },
    {
      step: 2,
      title: "Main Agent Orchestration",
      description: "The main conversational agent understands your request and coordinates with specialized sub-agents.",
      note: "Acts as the intelligent orchestrator of the entire workflow"
    },
    {
      step: 3,
      title: "Content Analysis Agent",
      description: "Specialized agent analyzes content using RAG search tools to find and examine relevant content.",
      note: "Uses Drupal Search API RAG tool for intelligent content discovery"
    },
    {
      step: 4,
      title: "Content Editor Agent", 
      description: "Specialized agent makes improvements using available tools like date formatters and draft creators.",
      note: "Has access to multiple tools and makes conservative, tracked changes"
    },
    {
      step: 5,
      title: "Tool Integration",
      description: "Sub-agents use specialized tools: RAG search, draft creation, date formatting, etc.",
      note: "Tools are connected via special 'tool' interface ports"
    },
    {
      step: 6,
      title: "Agent Collaboration",
      description: "Sub-agents report back to the main agent with their findings and completed work.",
      note: "Multi-agent coordination ensures comprehensive task completion"
    },
    {
      step: 7,
      title: "Orchestrated Response",
      description: "Main agent compiles results from all sub-agents and provides a comprehensive response.",
      note: "Includes summaries, draft links, and next steps for human review"
    }
  ],
  
  benefits: [
    "Multi-agent collaboration for complex tasks",
    "Specialized agents for specific content management functions",
    "Intelligent task orchestration and coordination", 
    "Tool-based architecture for extensibility",
    "Human oversight through draft approval process",
    "Scalable agent-to-agent communication patterns"
  ],
  
  useCases: [
    "Multi-agent content analysis and improvement",
    "Coordinated acronym standardization workflows",
    "Agent-orchestrated style guide enforcement",
    "Collaborative content quality assessment",
    "Tool-assisted bulk content transformations",
    "Intelligent editorial workflow automation"
  ]
};
