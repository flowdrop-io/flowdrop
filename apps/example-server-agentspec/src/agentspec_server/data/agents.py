"""Sample Agent Spec agent definitions for the discovery endpoint."""

agent_metadata = [
    {
        "name": "customer_support_agent",
        "description": (
            "A helpful customer support agent that can answer questions, "
            "look up information, and assist with common tasks."
        ),
        "inputs": [
            {
                "title": "user_message",
                "type": "string",
                "description": "The customer's message or question",
            },
            {
                "title": "session_id",
                "type": "string",
                "description": "Conversation session identifier",
            },
        ],
        "outputs": [
            {
                "title": "response",
                "type": "string",
                "description": "Agent's response to the customer",
            },
            {
                "title": "confidence",
                "type": "number",
                "description": "Confidence score of the response (0-1)",
            },
        ],
    },
    {
        "name": "data_analysis_agent",
        "description": (
            "Analyzes structured data and generates insights. "
            "Can process JSON datasets and produce summaries."
        ),
        "inputs": [
            {
                "title": "dataset",
                "type": "object",
                "description": "Input dataset as JSON",
            },
            {
                "title": "analysis_prompt",
                "type": "string",
                "description": "What to analyze or extract from the data",
            },
        ],
        "outputs": [
            {
                "title": "insights",
                "type": "string",
                "description": "Analysis insights in markdown format",
            },
            {
                "title": "summary_stats",
                "type": "object",
                "description": "Statistical summary of the data",
            },
        ],
    },
    {
        "name": "code_review_agent",
        "description": (
            "Reviews code changes and provides feedback on quality, "
            "security, and best practices."
        ),
        "inputs": [
            {
                "title": "code",
                "type": "string",
                "description": "Code to review",
            },
            {
                "title": "language",
                "type": "string",
                "description": "Programming language",
            },
        ],
        "outputs": [
            {
                "title": "review",
                "type": "string",
                "description": "Code review feedback in markdown",
            },
            {
                "title": "severity",
                "type": "string",
                "description": "Overall severity: low | medium | high",
            },
        ],
    },
]
