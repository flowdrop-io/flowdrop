/**
 * Port Configuration API Service
 * Handles fetching port configuration from the backend
 */

import type { PortConfig } from "../types/index.js";
import type { EndpointConfig } from "../config/endpoints.js";
import { buildEndpointUrl } from "../config/endpoints.js";
import { DEFAULT_PORT_CONFIG } from "../config/defaultPortConfig.js";
import { logger } from "../utils/logger.js";

/**
 * Fetch port configuration from API
 */
export async function fetchPortConfig(
  endpointConfig: EndpointConfig,
): Promise<PortConfig> {
  try {
    const url = buildEndpointUrl(
      endpointConfig,
      endpointConfig.endpoints.portConfig,
    );
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const portConfig: PortConfig = data.data ?? data;

    // Validate the configuration has required fields
    if (!portConfig.dataTypes || !Array.isArray(portConfig.dataTypes)) {
      logger.warn("Invalid port config received from API, using default");
      return DEFAULT_PORT_CONFIG;
    }

    return portConfig;
  } catch (error) {
    logger.error("Error fetching port configuration:", error);
    return DEFAULT_PORT_CONFIG;
  }
}

/**
 * Validate port configuration structure
 */
export function validatePortConfig(config: PortConfig): boolean {
  if (!config || typeof config !== "object") {
    return false;
  }

  if (!config.dataTypes || !Array.isArray(config.dataTypes)) {
    return false;
  }

  if (!config.defaultDataType || typeof config.defaultDataType !== "string") {
    return false;
  }

  // Check that all data types have required fields
  for (const dataType of config.dataTypes) {
    if (!dataType.id || !dataType.name || !dataType.color) {
      return false;
    }
  }

  return true;
}
