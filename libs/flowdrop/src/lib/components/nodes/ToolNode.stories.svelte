<script module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import NodeDecorator from "../../stories/NodeDecorator.svelte";
  import { createSampleNodeData } from "../../stories/utils.js";

  const { Story } = defineMeta({
    title: "Nodes/ToolNode",
    tags: ["autodocs"],
    parameters: {
      layout: "centered",
    },
  });
</script>

<Story name="Default">
  <NodeDecorator
    data={createSampleNodeData({
      label: "AI Content Analyzer",
      metadata: {
        id: "ai_content_analyzer",
        name: "AI Content Analyzer",
        description:
          "AI-powered content analysis for smart text processing and context understanding",
        category: "ai",
        version: "1.0.0",
        type: "tool",
        supportedTypes: ["tool", "default"],
        icon: "mdi:brain",
        color: "#9C27B0",
        inputs: [
          {
            id: "content",
            name: "Content to Analyze",
            type: "input",
            dataType: "mixed",
            required: false,
            description:
              "Text content or array of content items for AI analysis",
          },
          {
            id: "tool",
            name: "Tool",
            type: "input",
            dataType: "tool",
            required: false,
            description: "Available Tools",
          },
          {
            id: "trigger",
            name: "Trigger",
            type: "input",
            dataType: "trigger",
            required: false,
            description: "",
          },
        ],
        outputs: [
          {
            id: "tool",
            name: "Tool",
            type: "output",
            dataType: "tool",
            required: false,
            description: "Available tools",
          },
          {
            id: "analyzed_content",
            name: "analyzed_content",
            type: "output",
            dataType: "array",
            required: false,
            description: "Content items with AI analysis results",
          },
          {
            id: "total_analyzed",
            name: "total_analyzed",
            type: "output",
            dataType: "number",
            required: false,
            description: "Total number of items analyzed",
          },
          {
            id: "analysis_mode",
            name: "analysis_mode",
            type: "output",
            dataType: "string",
            required: false,
            description: "The analysis mode used",
          },
        ],
      },
    })}
  />
</Story>

<Story name="Multiple Parameters">
  <NodeDecorator
    data={createSampleNodeData({
      label: "Content Classifier",
      metadata: {
        id: "content_classifier",
        name: "Content Classifier",
        description:
          "Classify content into categories (support, features, sales) for proper triage",
        category: "ai",
        version: "1.0.0",
        type: "tool",
        supportedTypes: ["tool", "default"],
        icon: "mdi:tag-multiple",
        color: "#9C27B0",
        inputs: [
          {
            id: "tool",
            name: "Tool",
            type: "input",
            dataType: "tool",
            required: false,
            description: "Available Tools",
          },
          {
            id: "structured_data",
            name: "Structured Data",
            type: "input",
            dataType: "json",
            required: false,
            description: "Processed form data for classification",
          },
          {
            id: "raw_data",
            name: "Raw Data",
            type: "input",
            dataType: "json",
            required: false,
            description: "Original form data",
          },
          {
            id: "submission_id",
            name: "Submission ID",
            type: "input",
            dataType: "string",
            required: false,
            description: "Unique submission identifier",
          },
          {
            id: "trigger",
            name: "Trigger",
            type: "input",
            dataType: "trigger",
            required: false,
            description: "",
          },
        ],
        outputs: [
          {
            id: "tool",
            name: "Tool",
            type: "output",
            dataType: "tool",
            required: false,
            description: "Available tools",
          },
          {
            id: "primary_category",
            name: "primary_category",
            type: "output",
            dataType: "string",
            required: false,
            description: "Primary classification category",
          },
          {
            id: "confidence",
            name: "confidence",
            type: "output",
            dataType: "number",
            required: false,
            description: "Classification confidence score (0-1)",
          },
          {
            id: "priority_level",
            name: "priority_level",
            type: "output",
            dataType: "string",
            required: false,
            description: "Priority level (normal, medium, high)",
          },
        ],
      },
    })}
  />
</Story>
