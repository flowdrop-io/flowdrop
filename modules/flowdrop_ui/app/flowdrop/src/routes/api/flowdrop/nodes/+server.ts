import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { sampleNodes } from "$lib/data/samples.js";
import type { NodeMetadata, NodesResponse } from "$lib/types/index.js";

/**
 * Validate and sanitize query parameters
 */
function validateQueryParams(searchParams: URLSearchParams): {
  category?: string;
  search?: string;
  limit: number;
  offset: number;
} {
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  
  // Validate limit
  let limit = parseInt(searchParams.get("limit") || "100");
  if (isNaN(limit) || limit < 1 || limit > 1000) {
    limit = 100;
  }
  
  // Validate offset
  let offset = parseInt(searchParams.get("offset") || "0");
  if (isNaN(offset) || offset < 0) {
    offset = 0;
  }
  
  // Validate category if provided
  const validCategories = ["models", "input", "output", "processing", "conditional", "utility", "integration"];
  const validatedCategory = category && validCategories.includes(category) ? category : undefined;
  
  // Sanitize search query
  const sanitizedSearch = search ? search.trim().slice(0, 100) : undefined;
  
  return {
    category: validatedCategory,
    search: sanitizedSearch,
    limit,
    offset
  };
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
 * GET /api/nodes
 * Fetch available node types with optional filtering
 * Strictly server-side with validation and security headers
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    // Validate and sanitize query parameters
    const { category, search, limit, offset } = validateQueryParams(url.searchParams);
    
    // Start with all sample nodes
    let filteredNodes: NodeMetadata[] = [...sampleNodes];
    
    // Filter by category if specified
    if (category && category !== "all") {
      filteredNodes = filteredNodes.filter(node => node.category === category);
    }
    
    // Filter by search query if specified
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      filteredNodes = filteredNodes.filter(node => 
        node.name.toLowerCase().includes(searchLower) ||
        node.description.toLowerCase().includes(searchLower) ||
        node.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply pagination
    const totalCount = filteredNodes.length;
    const paginatedNodes = filteredNodes.slice(offset, offset + limit);
    
    const response: NodesResponse = {
      success: true,
      data: paginatedNodes,
      message: `Found ${paginatedNodes.length} node types`
    };
    
    // Add pagination metadata to headers
    const headers = {
      "X-Total-Count": totalCount.toString(),
      "X-Page-Size": limit.toString(),
      "X-Page-Offset": offset.toString(),
      ...setCorsHeaders()
    };
    
    return json(response, { headers });
    
  } catch (error) {
    console.error("Error fetching nodes:", error);
    
    const errorResponse: NodesResponse = {
      success: false,
      error: "Failed to fetch node types",
      message: error instanceof Error ? error.message : "Unknown error occurred"
    };
    
    return json(errorResponse, { 
      status: 500,
      headers: setCorsHeaders()
    });
  }
};

/**
 * OPTIONS /api/nodes
 * Handle CORS preflight requests
 */
export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    status: 204,
    headers: setCorsHeaders()
  });
};

 