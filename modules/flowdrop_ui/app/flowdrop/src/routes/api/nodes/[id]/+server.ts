import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { sampleNodes } from "$lib/data/samples.js";
import type { NodeMetadata, ApiResponse } from "$lib/types/index.js";

/**
 * Validate node ID
 */
function validateNodeId(nodeId: string): boolean {
  // Check if nodeId is a valid string and not too long
  return typeof nodeId === "string" && 
         nodeId.length > 0 && 
         nodeId.length <= 100 &&
         /^[a-zA-Z0-9-_]+$/.test(nodeId);
}

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
 * GET /api/nodes/{id}
 * Get a specific node type by ID
 * Strictly server-side with validation and security headers
 */
export const GET: RequestHandler = async ({ params }) => {
  try {
    const nodeId = params.id;
    
    // Validate node ID
    if (!nodeId || !validateNodeId(nodeId)) {
      return json({
        success: false,
        error: "Invalid node ID"
      }, { 
        status: 400,
        headers: setCorsHeaders()
      });
    }

    const node = sampleNodes.find(n => n.id === nodeId);
    
    if (!node) {
      return json({
        success: false,
        error: "Node type not found"
      }, { 
        status: 404,
        headers: setCorsHeaders()
      });
    }

    const response: ApiResponse<NodeMetadata> = {
      success: true,
      data: node
    };

    return json(response, { headers: setCorsHeaders() });

  } catch (error) {
    console.error("Error fetching node:", error);
    
    const errorResponse: ApiResponse<NodeMetadata> = {
      success: false,
      error: "Failed to fetch node type",
      message: error instanceof Error ? error.message : "Unknown error occurred"
    };

    return json(errorResponse, { 
      status: 500,
      headers: setCorsHeaders()
    });
  }
};

/**
 * OPTIONS /api/nodes/{id}
 * Handle CORS preflight requests
 */
export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    status: 204,
    headers: setCorsHeaders()
  });
}; 