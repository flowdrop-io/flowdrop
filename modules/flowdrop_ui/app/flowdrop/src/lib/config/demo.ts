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
  title: "AI-Powered Content Management Demo",
  description: "This demo shows how FlowDrop can help you manage and improve your Drupal content using AI.",
  
  steps: [
    {
      step: 1,
      title: "Enter Instructions",
      description: "Start by telling the AI what kind of content changes you need in the Chat Input node.",
      example: "Find all blog posts about 'XB' and check if it's being used correctly as an acronym"
    },
    {
      step: 2,
      title: "Search Content",
      description: "The Drupal Search API RAG node will find relevant content from your site.",
      note: "Uses AI-powered ranking to find the most relevant content"
    },
    {
      step: 3,
      title: "Analyze Content",
      description: "AI Content Analyzer reviews the content for issues like acronym misuse, formatting problems, or quality issues.",
      note: "Configurable analysis rules and strictness levels"
    },
    {
      step: 4,
      title: "Edit Content",
      description: "AI Content Editor makes suggested improvements based on the analysis.",
      note: "All changes are tracked and require human approval"
    },
    {
      step: 5,
      title: "Review Step (Optional)",
      description: "Date Format Converter demonstrates additional review steps you can add.",
      note: "Extract and standardize date formats across your content"
    },
    {
      step: 6,
      title: "Create Drafts",
      description: "Draft Creator saves the improved content as draft versions in Drupal for review.",
      note: "Integrates with Drupal's editorial workflow"
    },
    {
      step: 7,
      title: "Get Results",
      description: "Chat Response provides a summary of what was accomplished and next steps.",
      note: "Includes links to review and approve the changes"
    }
  ],
  
  benefits: [
    "Automated content quality improvement",
    "Consistent style guide enforcement", 
    "Human oversight and approval process",
    "Detailed change tracking and logging",
    "Integration with existing Drupal workflows",
    "Scalable for bulk content updates"
  ],
  
  useCases: [
    "Acronym standardization across all content",
    "Date format consistency",
    "Style guide enforcement",
    "Content quality improvement",
    "Bulk content updates",
    "Editorial workflow automation"
  ]
};
