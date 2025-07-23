/**
 * FlowDrop Endpoint Configuration
 * Provides configurable endpoints for all API actions
 */

export interface EndpointConfig {
  /** Base URL for all endpoints */
  baseUrl: string;
  
  /** Individual endpoint paths */
  endpoints: {
    // Node endpoints
    nodes: {
      list: string;
      get: string;
      byCategory: string;
      metadata: string;
    };
    
    // Workflow endpoints
    workflows: {
      list: string;
      get: string;
      create: string;
      update: string;
      delete: string;
      validate: string;
      export: string;
      import: string;
    };
    
    // Execution endpoints
    executions: {
      execute: string;
      status: string;
      cancel: string;
      logs: string;
      history: string;
    };
    
    // Template endpoints
    templates: {
      list: string;
      get: string;
      create: string;
      update: string;
      delete: string;
    };
    
    // User endpoints
    users: {
      profile: string;
      preferences: string;
    };
    
    // System endpoints
    system: {
      health: string;
      config: string;
      version: string;
    };
  };
  
  /** HTTP method overrides for specific endpoints */
  methods?: {
    [key: string]: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  };
  
  /** Custom headers for specific endpoints */
  headers?: {
    [key: string]: Record<string, string>;
  };
  
  /** Authentication configuration */
  auth?: {
    type: 'none' | 'bearer' | 'api_key' | 'custom';
    token?: string;
    apiKey?: string;
    headers?: Record<string, string>;
  };
  
  /** Request timeout in milliseconds */
  timeout?: number;
  
  /** Retry configuration */
  retry?: {
    enabled: boolean;
    maxAttempts: number;
    delay: number;
    backoff?: 'linear' | 'exponential';
  };
}

/**
 * Default endpoint configuration
 */
export const defaultEndpointConfig: EndpointConfig = {
  baseUrl: '/api/flowdrop',
  endpoints: {
    nodes: {
      list: '/nodes',
      get: '/nodes/{id}',
      byCategory: '/nodes?category={category}',
      metadata: '/nodes/{id}/metadata',
    },
    workflows: {
      list: '/workflows',
      get: '/workflows/{id}',
      create: '/workflows',
      update: '/workflows/{id}',
      delete: '/workflows/{id}',
      validate: '/workflows/validate',
      export: '/workflows/{id}/export',
      import: '/workflows/import',
    },
    executions: {
      execute: '/workflows/{id}/execute',
      status: '/executions/{id}',
      cancel: '/executions/{id}/cancel',
      logs: '/executions/{id}/logs',
      history: '/executions',
    },
    templates: {
      list: '/templates',
      get: '/templates/{id}',
      create: '/templates',
      update: '/templates/{id}',
      delete: '/templates/{id}',
    },
    users: {
      profile: '/users/profile',
      preferences: '/users/preferences',
    },
    system: {
      health: '/system/health',
      config: '/system/config',
      version: '/system/version',
    },
  },
  timeout: 30000,
  retry: {
    enabled: true,
    maxAttempts: 3,
    delay: 1000,
    backoff: 'exponential',
  },
};

/**
 * Create endpoint configuration with custom base URL
 */
export function createEndpointConfig(baseUrl: string, overrides?: Partial<EndpointConfig>): EndpointConfig {
  const config = {
    ...defaultEndpointConfig,
    baseUrl: baseUrl.replace(/\/$/, ''),
    ...overrides,
  };
  
  return config;
}

/**
 * Build full URL for an endpoint
 */
export function buildEndpointUrl(config: EndpointConfig, endpointPath: string, params?: Record<string, string>): string {
  let url = endpointPath;
  
  // Replace path parameters
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`{${key}}`, encodeURIComponent(value));
    });
  }
  
  // Ensure URL starts with base URL
  if (!url.startsWith('http') && !url.startsWith('//')) {
    url = `${config.baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
  }
  
  return url;
}

/**
 * Get HTTP method for an endpoint
 */
export function getEndpointMethod(config: EndpointConfig, endpointKey: string): string {
  return config.methods?.[endpointKey] || 'GET';
}

/**
 * Get custom headers for an endpoint
 */
export function getEndpointHeaders(config: EndpointConfig, endpointKey: string): Record<string, string> {
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add authentication headers
  if (config.auth?.type === 'bearer' && config.auth.token) {
    baseHeaders['Authorization'] = `Bearer ${config.auth.token}`;
  } else if (config.auth?.type === 'api_key' && config.auth.apiKey) {
    baseHeaders['X-API-Key'] = config.auth.apiKey;
  } else if (config.auth?.type === 'custom' && config.auth.headers) {
    Object.assign(baseHeaders, config.auth.headers);
  }
  
  // Add endpoint-specific headers
  const endpointHeaders = config.headers?.[endpointKey];
  if (endpointHeaders) {
    Object.assign(baseHeaders, endpointHeaders);
  }
  
  return baseHeaders;
} 