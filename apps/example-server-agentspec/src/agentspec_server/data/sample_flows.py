"""Pre-built sample Agent Spec flows for testing and demonstration.

These flows can be submitted directly to POST /flows/execute.
"""


def simple_llm_flow() -> dict:
    """A minimal flow: start → llm_node → end.

    Sends a prompt to the LLM and returns the response.
    """
    return {
        "component_type": "flow",
        "name": "Simple LLM Chat",
        "description": "A minimal flow that sends a prompt to an LLM and returns the response.",
        "start_node": "start",
        "nodes": [
            {
                "component_type": "start_node",
                "name": "start",
                "outputs": [
                    {"title": "user_prompt", "type": "string"},
                ],
            },
            {
                "component_type": "llm_node",
                "name": "generate_response",
                "description": "Generate a response using the configured LLM",
                "prompt_template": "{{user_prompt}}",
                "system_prompt": "You are a helpful assistant. Be concise and clear.",
                "inputs": [
                    {"title": "user_prompt", "type": "string"},
                ],
                "outputs": [
                    {"title": "llm_output", "type": "string"},
                ],
            },
            {
                "component_type": "end_node",
                "name": "end",
                "inputs": [
                    {"title": "response", "type": "string"},
                ],
            },
        ],
        "control_flow_connections": [
            {"name": "start_to_llm", "from_node": "start", "to_node": "generate_response"},
            {"name": "llm_to_end", "from_node": "generate_response", "to_node": "end"},
        ],
        "data_flow_connections": [
            {
                "name": "prompt_to_llm",
                "source_node": "start",
                "source_output": "user_prompt",
                "destination_node": "generate_response",
                "destination_input": "user_prompt",
            },
            {
                "name": "llm_to_result",
                "source_node": "generate_response",
                "source_output": "llm_output",
                "destination_node": "end",
                "destination_input": "response",
            },
        ],
    }


def tool_usage_flow() -> dict:
    """A flow that uses tools: start → llm_node (with tools) → end.

    The LLM can call the calculator and web_search tools.
    """
    return {
        "component_type": "flow",
        "name": "Tool-Augmented Chat",
        "description": "An LLM flow with access to calculator and web search tools.",
        "start_node": "start",
        "nodes": [
            {
                "component_type": "start_node",
                "name": "start",
                "outputs": [
                    {"title": "user_query", "type": "string"},
                ],
            },
            {
                "component_type": "llm_node",
                "name": "agent",
                "description": "LLM agent with tool access",
                "prompt_template": "{{user_query}}",
                "system_prompt": (
                    "You are a helpful assistant with access to tools. "
                    "Use the calculator for math and web_search for information lookup."
                ),
                "inputs": [
                    {"title": "user_query", "type": "string"},
                ],
                "outputs": [
                    {"title": "llm_output", "type": "string"},
                ],
            },
            {
                "component_type": "end_node",
                "name": "end",
                "inputs": [
                    {"title": "answer", "type": "string"},
                ],
            },
        ],
        "control_flow_connections": [
            {"name": "start_to_agent", "from_node": "start", "to_node": "agent"},
            {"name": "agent_to_end", "from_node": "agent", "to_node": "end"},
        ],
        "data_flow_connections": [
            {
                "name": "query_to_agent",
                "source_node": "start",
                "source_output": "user_query",
                "destination_node": "agent",
                "destination_input": "user_query",
            },
            {
                "name": "agent_to_result",
                "source_node": "agent",
                "source_output": "llm_output",
                "destination_node": "end",
                "destination_input": "answer",
            },
        ],
    }


def branching_flow() -> dict:
    """A flow with conditional branching: start → branching_node → llm_a / llm_b → end.

    Demonstrates conditional routing based on input.
    """
    return {
        "component_type": "flow",
        "name": "Branching Example",
        "description": "A flow demonstrating conditional routing with two LLM paths.",
        "start_node": "start",
        "nodes": [
            {
                "component_type": "start_node",
                "name": "start",
                "outputs": [
                    {"title": "user_input", "type": "string"},
                    {"title": "mode", "type": "string"},
                ],
            },
            {
                "component_type": "branching_node",
                "name": "router",
                "description": "Route based on mode: 'creative' or 'precise'",
                "branches": [
                    {"name": "creative", "condition": "mode == 'creative'"},
                    {"name": "precise", "condition": "mode == 'precise'"},
                ],
                "inputs": [
                    {"title": "mode", "type": "string"},
                ],
            },
            {
                "component_type": "llm_node",
                "name": "creative_llm",
                "prompt_template": "Be creative and imaginative: {{user_input}}",
                "system_prompt": "You are a creative writer. Be expressive and artistic.",
                "inputs": [
                    {"title": "user_input", "type": "string"},
                ],
                "outputs": [
                    {"title": "llm_output", "type": "string"},
                ],
            },
            {
                "component_type": "llm_node",
                "name": "precise_llm",
                "prompt_template": "Be precise and factual: {{user_input}}",
                "system_prompt": "You are a precise analyst. Be factual and concise.",
                "inputs": [
                    {"title": "user_input", "type": "string"},
                ],
                "outputs": [
                    {"title": "llm_output", "type": "string"},
                ],
            },
            {
                "component_type": "end_node",
                "name": "end",
                "inputs": [
                    {"title": "result", "type": "string"},
                ],
            },
        ],
        "control_flow_connections": [
            {"name": "start_to_router", "from_node": "start", "to_node": "router"},
            {"name": "router_creative", "from_node": "router", "to_node": "creative_llm", "from_branch": "creative"},
            {"name": "router_precise", "from_node": "router", "to_node": "precise_llm", "from_branch": "precise"},
            {"name": "creative_to_end", "from_node": "creative_llm", "to_node": "end"},
            {"name": "precise_to_end", "from_node": "precise_llm", "to_node": "end"},
        ],
        "data_flow_connections": [
            {
                "name": "input_to_router",
                "source_node": "start",
                "source_output": "mode",
                "destination_node": "router",
                "destination_input": "mode",
            },
            {
                "name": "input_to_creative",
                "source_node": "start",
                "source_output": "user_input",
                "destination_node": "creative_llm",
                "destination_input": "user_input",
            },
            {
                "name": "input_to_precise",
                "source_node": "start",
                "source_output": "user_input",
                "destination_node": "precise_llm",
                "destination_input": "user_input",
            },
            {
                "name": "creative_to_result",
                "source_node": "creative_llm",
                "source_output": "llm_output",
                "destination_node": "end",
                "destination_input": "result",
            },
            {
                "name": "precise_to_result",
                "source_node": "precise_llm",
                "source_output": "llm_output",
                "destination_node": "end",
                "destination_input": "result",
            },
        ],
    }


# All sample flows keyed by name
sample_flows: dict[str, dict] = {
    "simple_llm_chat": simple_llm_flow(),
    "tool_augmented_chat": tool_usage_flow(),
    "branching_example": branching_flow(),
}
