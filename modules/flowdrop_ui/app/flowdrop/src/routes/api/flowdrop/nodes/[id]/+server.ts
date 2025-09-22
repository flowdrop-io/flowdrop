import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { sampleNodes, filterNodesForDemo } from "$lib/data/samples.js";
import { getCurrentDemoConfig } from "$lib/config/demo.js";
import type { NodeMetadata } from "$lib/types/index.js";

/**
 * Set CORS headers for API responses
 */
function setCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Cache-Control": "public, max-age=300", // Cache for 5 minutes
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block"
  };
}

/**
 * GET /api/nodes/[id]
 * Fetch a specific node type by ID
 */
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;
    
    if (!id) {
      return json(
        { 
          success: false, 
          error: "Node ID is required",
          message: "Please provide a valid node ID"
        },
        { 
          status: 400,
          headers: setCorsHeaders()
        }
      );
    }
    
    // Apply demo filtering first, then find the node by ID
    const demoConfig = getCurrentDemoConfig();
    const filteredNodes = filterNodesForDemo(sampleNodes, demoConfig);
    const node = filteredNodes.find(n => n.id === id);
    
    if (!node) {
      return json(
        { 
          success: false, 
          error: "Node not found",
          message: `Node with ID '${id}' not found`
        },
        { 
          status: 404,
          headers: setCorsHeaders()
        }
      );
    }
    
    const response = {
      success: true,
      data: node,
      message: `Found node: ${node.name}`
    };
    
    return json(response, { headers: setCorsHeaders() });
    
  } catch (error) {
    console.error("Error fetching node:", error);
    
    return json(
      { 
        success: false, 
        error: "Failed to fetch node",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      },
      { 
        status: 500,
        headers: setCorsHeaders()
      }
    );
  }
};

/**
 * OPTIONS /api/nodes/[id]
 * Handle CORS preflight requests
 */
export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    status: 204,
    headers: setCorsHeaders()
  });
}; 