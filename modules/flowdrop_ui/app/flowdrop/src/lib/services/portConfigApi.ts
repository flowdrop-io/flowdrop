/**
 * Port Configuration API Service
 * Handles fetching port configuration from the backend
 */

import type { PortConfig } from "../types/index.js";
import type { EndpointConfig } from "../config/endpoints.js";
import { buildEndpointUrl } from "../config/endpoints.js";
import { DEFAULT_PORT_CONFIG } from "../config/defaultPortConfig.js";

/**
 * Fetch port configuration from API
 */
export async function fetchPortConfig(endpointConfig: EndpointConfig): Promise<PortConfig> {
  try {
    const url = buildEndpointUrl(endpointConfig, endpointConfig.endpoints.portConfig);
    
    console.log("📡 Fetching port configuration from:", url);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn("⚠️ Failed to fetch port config from API, using default:", response.status, response.statusText);
      return DEFAULT_PORT_CONFIG;
    }

    const portConfig: PortConfig = await response.json();
    
    // Validate the configuration has required fields
    if (!portConfig.dataTypes || !Array.isArray(portConfig.dataTypes)) {
      console.warn("⚠️ Invalid port config received from API, using default");
      return DEFAULT_PORT_CONFIG;
    }

    console.log("✅ Port configuration loaded successfully:", {
      version: portConfig.version,
      dataTypesCount: portConfig.dataTypes.length,
      rulesCount: portConfig.compatibilityRules?.length || 0,
      defaultType: portConfig.defaultDataType
    });

    return portConfig;
  } catch (error) {
    console.error("❌ Error fetching port configuration:", error);
    console.log("🔄 Falling back to default port configuration");
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

  // Check that compatibility rules reference valid data types
  if (config.compatibilityRules) {
    const dataTypeIds = new Set(config.dataTypes.map(dt => dt.id));
    for (const rule of config.compatibilityRules) {
      if (!dataTypeIds.has(rule.sourceType) || !dataTypeIds.has(rule.targetType)) {
        console.warn("⚠️ Compatibility rule references unknown data type:", rule);
        return false;
      }
    }
  }

  return true;
}
