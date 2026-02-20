"""Sample tool definitions with real Python implementations.

These tools are registered with WayFlow's AgentSpecLoader so that
tool_node components in Agent Spec flows can invoke them.
"""

import ast
import operator
from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------

def web_search(query: str, max_results: int = 5) -> list[dict]:
    """Search the web for information (sample implementation).

    In production, this would call a real search API.
    Returns mock results that demonstrate the tool interface.
    """
    return [
        {
            "title": f"Result {i + 1} for: {query}",
            "url": f"https://example.com/search?q={query.replace(' ', '+')}&page={i + 1}",
            "snippet": f"This is a sample search result about '{query}'. "
            f"In a real implementation, this would contain actual web content.",
        }
        for i in range(min(max_results, 5))
    ]


def calculator(expression: str) -> dict:
    """Safely evaluate a mathematical expression.

    Supports basic arithmetic: +, -, *, /, **, //, %
    """
    allowed_operators = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.FloorDiv: operator.floordiv,
        ast.Mod: operator.mod,
        ast.Pow: operator.pow,
        ast.USub: operator.neg,
    }

    def _eval(node):
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return node.value
        if isinstance(node, ast.UnaryOp) and type(node.op) in allowed_operators:
            return allowed_operators[type(node.op)](_eval(node.operand))
        if isinstance(node, ast.BinOp) and type(node.op) in allowed_operators:
            return allowed_operators[type(node.op)](
                _eval(node.left), _eval(node.right)
            )
        raise ValueError(f"Unsupported expression: {ast.dump(node)}")

    try:
        tree = ast.parse(expression, mode="eval")
        result = _eval(tree.body)
        return {"expression": expression, "result": result}
    except Exception as e:
        return {"expression": expression, "error": str(e)}


def get_current_time(timezone_name: str = "UTC") -> str:
    """Return the current date and time in ISO format."""
    now = datetime.now(timezone.utc)
    return now.isoformat()


def text_transform(text: str, operation: str = "uppercase") -> str:
    """Transform text using the specified operation.

    Supported operations: uppercase, lowercase, capitalize, reverse, length
    """
    ops = {
        "uppercase": lambda t: t.upper(),
        "lowercase": lambda t: t.lower(),
        "capitalize": lambda t: t.title(),
        "reverse": lambda t: t[::-1],
        "length": lambda t: str(len(t)),
    }
    fn = ops.get(operation, ops["uppercase"])
    return fn(text)


def json_extract(data: dict, path: str) -> str:
    """Extract a value from a JSON object using dot-notation path.

    Example: json_extract({"a": {"b": 1}}, "a.b") → "1"
    """
    current = data
    for key in path.split("."):
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return f"Path '{path}' not found"
    return str(current)


# ---------------------------------------------------------------------------
# Tool registry — maps tool names to Python callables
# ---------------------------------------------------------------------------

tool_registry: dict[str, callable] = {
    "web_search": web_search,
    "calculator": calculator,
    "get_current_time": get_current_time,
    "text_transform": text_transform,
    "json_extract": json_extract,
}


# ---------------------------------------------------------------------------
# Tool metadata for discovery endpoint (GET /tools)
# ---------------------------------------------------------------------------

tool_metadata = [
    {
        "name": "web_search",
        "description": "Search the web for information using a query string",
        "component_type": "server_tool",
        "inputs": [
            {"title": "query", "type": "string", "description": "Search query"},
            {
                "title": "max_results",
                "type": "integer",
                "description": "Maximum number of results to return",
                "default": 5,
            },
        ],
        "outputs": [
            {"title": "results", "type": "array", "description": "Search results"},
        ],
    },
    {
        "name": "calculator",
        "description": "Safely evaluate mathematical expressions (supports +, -, *, /, **, //, %)",
        "component_type": "server_tool",
        "inputs": [
            {
                "title": "expression",
                "type": "string",
                "description": "Mathematical expression to evaluate",
            },
        ],
        "outputs": [
            {"title": "result", "type": "object", "description": "Calculation result"},
        ],
    },
    {
        "name": "get_current_time",
        "description": "Get the current date and time in ISO format",
        "component_type": "server_tool",
        "inputs": [
            {
                "title": "timezone_name",
                "type": "string",
                "description": "Timezone name",
                "default": "UTC",
            },
        ],
        "outputs": [
            {
                "title": "time",
                "type": "string",
                "description": "Current time in ISO format",
            },
        ],
    },
    {
        "name": "text_transform",
        "description": "Transform text using various operations (uppercase, lowercase, capitalize, reverse, length)",
        "component_type": "server_tool",
        "inputs": [
            {"title": "text", "type": "string", "description": "Text to transform"},
            {
                "title": "operation",
                "type": "string",
                "description": "Transform operation",
                "default": "uppercase",
                "enum": ["uppercase", "lowercase", "capitalize", "reverse", "length"],
            },
        ],
        "outputs": [
            {
                "title": "result",
                "type": "string",
                "description": "Transformed text",
            },
        ],
    },
    {
        "name": "json_extract",
        "description": "Extract a value from a JSON object using dot-notation path",
        "component_type": "server_tool",
        "inputs": [
            {"title": "data", "type": "object", "description": "JSON object"},
            {
                "title": "path",
                "type": "string",
                "description": "Dot-notation path (e.g. 'user.name')",
            },
        ],
        "outputs": [
            {
                "title": "value",
                "type": "string",
                "description": "Extracted value as string",
            },
        ],
    },
]
