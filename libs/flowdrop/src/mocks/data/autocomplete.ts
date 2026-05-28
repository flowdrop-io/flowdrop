/**
 * Mock data for autocomplete form fields
 *
 * Provides sample data for testing autocomplete functionality with various
 * data types: users, tags, categories, products, and locations.
 */

/**
 * User interface for autocomplete suggestions
 */
export interface MockUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  department?: string;
  role?: string;
}

/**
 * Tag interface for autocomplete suggestions
 */
export interface MockTag {
  id: string;
  name: string;
  color?: string;
  count?: number;
}

/**
 * Category interface for autocomplete suggestions
 */
export interface MockCategory {
  id: string;
  label: string;
  description?: string;
  parentId?: string;
}

/**
 * Product interface for autocomplete suggestions
 */
export interface MockProduct {
  sku: string;
  title: string;
  price: number;
  category?: string;
  inStock?: boolean;
}

/**
 * Location interface for autocomplete suggestions
 */
export interface MockLocation {
  code: string;
  city: string;
  country: string;
  timezone?: string;
}

/**
 * Mock users data
 */
export const mockUsers: MockUser[] = [
  {
    id: 'user-001',
    name: 'Alice Johnson',
    email: 'alice.johnson@example.com',
    department: 'Engineering',
    role: 'Senior Developer'
  },
  {
    id: 'user-002',
    name: 'Bob Smith',
    email: 'bob.smith@example.com',
    department: 'Engineering',
    role: 'Tech Lead'
  },
  {
    id: 'user-003',
    name: 'Carol Williams',
    email: 'carol.williams@example.com',
    department: 'Design',
    role: 'UX Designer'
  },
  {
    id: 'user-004',
    name: 'David Brown',
    email: 'david.brown@example.com',
    department: 'Product',
    role: 'Product Manager'
  },
  {
    id: 'user-005',
    name: 'Emma Davis',
    email: 'emma.davis@example.com',
    department: 'Engineering',
    role: 'Junior Developer'
  },
  {
    id: 'user-006',
    name: 'Frank Miller',
    email: 'frank.miller@example.com',
    department: 'QA',
    role: 'QA Engineer'
  },
  {
    id: 'user-007',
    name: 'Grace Wilson',
    email: 'grace.wilson@example.com',
    department: 'Marketing',
    role: 'Marketing Manager'
  },
  {
    id: 'user-008',
    name: 'Henry Taylor',
    email: 'henry.taylor@example.com',
    department: 'Engineering',
    role: 'DevOps Engineer'
  },
  {
    id: 'user-009',
    name: 'Ivy Anderson',
    email: 'ivy.anderson@example.com',
    department: 'Support',
    role: 'Support Lead'
  },
  {
    id: 'user-010',
    name: 'Jack Thomas',
    email: 'jack.thomas@example.com',
    department: 'Engineering',
    role: 'Backend Developer'
  }
];

/**
 * Mock tags data
 */
export const mockTags: MockTag[] = [
  { id: 'tag-bug', name: 'bug', color: '#ef4444', count: 42 },
  { id: 'tag-feature', name: 'feature', color: '#22c55e', count: 156 },
  { id: 'tag-enhancement', name: 'enhancement', color: '#3b82f6', count: 89 },
  {
    id: 'tag-documentation',
    name: 'documentation',
    color: '#a855f7',
    count: 34
  },
  { id: 'tag-urgent', name: 'urgent', color: '#f97316', count: 12 },
  { id: 'tag-blocked', name: 'blocked', color: '#dc2626', count: 8 },
  { id: 'tag-needs-review', name: 'needs-review', color: '#eab308', count: 27 },
  { id: 'tag-in-progress', name: 'in-progress', color: '#06b6d4', count: 45 },
  { id: 'tag-testing', name: 'testing', color: '#8b5cf6', count: 23 },
  { id: 'tag-ready', name: 'ready', color: '#10b981', count: 67 }
];

/**
 * Mock categories data
 */
export const mockCategories: MockCategory[] = [
  {
    id: 'cat-ai',
    label: 'Artificial Intelligence',
    description: 'AI and ML related nodes'
  },
  {
    id: 'cat-data',
    label: 'Data Processing',
    description: 'Data transformation and manipulation'
  },
  {
    id: 'cat-integration',
    label: 'Integrations',
    description: 'Third-party service integrations'
  },
  {
    id: 'cat-logic',
    label: 'Logic & Control',
    description: 'Conditional and control flow nodes'
  },
  {
    id: 'cat-input',
    label: 'Input Sources',
    description: 'Data input and trigger nodes'
  },
  {
    id: 'cat-output',
    label: 'Output Destinations',
    description: 'Data output and action nodes'
  },
  {
    id: 'cat-transform',
    label: 'Transformations',
    description: 'Data transformation utilities'
  },
  {
    id: 'cat-util',
    label: 'Utilities',
    description: 'Helper and utility nodes'
  }
];

/**
 * Mock products data
 */
export const mockProducts: MockProduct[] = [
  {
    sku: 'PROD-001',
    title: 'Wireless Keyboard',
    price: 79.99,
    category: 'Electronics',
    inStock: true
  },
  {
    sku: 'PROD-002',
    title: 'USB-C Hub',
    price: 49.99,
    category: 'Electronics',
    inStock: true
  },
  {
    sku: 'PROD-003',
    title: 'Monitor Stand',
    price: 129.99,
    category: 'Furniture',
    inStock: false
  },
  {
    sku: 'PROD-004',
    title: 'Webcam HD',
    price: 89.99,
    category: 'Electronics',
    inStock: true
  },
  {
    sku: 'PROD-005',
    title: 'Desk Lamp',
    price: 39.99,
    category: 'Lighting',
    inStock: true
  },
  {
    sku: 'PROD-006',
    title: 'Mouse Pad XL',
    price: 24.99,
    category: 'Accessories',
    inStock: true
  },
  {
    sku: 'PROD-007',
    title: 'Cable Management Kit',
    price: 19.99,
    category: 'Accessories',
    inStock: true
  },
  {
    sku: 'PROD-008',
    title: 'Noise Cancelling Headphones',
    price: 299.99,
    category: 'Audio',
    inStock: false
  }
];

/**
 * Mock locations data
 */
export const mockLocations: MockLocation[] = [
  {
    code: 'NYC',
    city: 'New York',
    country: 'United States',
    timezone: 'America/New_York'
  },
  {
    code: 'LON',
    city: 'London',
    country: 'United Kingdom',
    timezone: 'Europe/London'
  },
  { code: 'TKY', city: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo' },
  { code: 'PAR', city: 'Paris', country: 'France', timezone: 'Europe/Paris' },
  {
    code: 'SYD',
    city: 'Sydney',
    country: 'Australia',
    timezone: 'Australia/Sydney'
  },
  {
    code: 'BER',
    city: 'Berlin',
    country: 'Germany',
    timezone: 'Europe/Berlin'
  },
  {
    code: 'SFO',
    city: 'San Francisco',
    country: 'United States',
    timezone: 'America/Los_Angeles'
  },
  {
    code: 'SIN',
    city: 'Singapore',
    country: 'Singapore',
    timezone: 'Asia/Singapore'
  },
  {
    code: 'DXB',
    city: 'Dubai',
    country: 'United Arab Emirates',
    timezone: 'Asia/Dubai'
  },
  {
    code: 'TOR',
    city: 'Toronto',
    country: 'Canada',
    timezone: 'America/Toronto'
  }
];

/**
 * Search users by query string
 * Matches against name and email
 * @param query - Search query
 * @returns Filtered users
 */
export function searchUsers(query: string): MockUser[] {
  if (!query || query.trim() === '') {
    return mockUsers;
  }
  const lowerQuery = query.toLowerCase();
  return mockUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(lowerQuery) ||
      user.email.toLowerCase().includes(lowerQuery) ||
      user.department?.toLowerCase().includes(lowerQuery) ||
      user.role?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Search tags by query string
 * @param query - Search query
 * @returns Filtered tags
 */
export function searchTags(query: string): MockTag[] {
  if (!query || query.trim() === '') {
    return mockTags;
  }
  const lowerQuery = query.toLowerCase();
  return mockTags.filter((tag) => tag.name.toLowerCase().includes(lowerQuery));
}

/**
 * Search categories by query string
 * @param query - Search query
 * @returns Filtered categories
 */
export function searchCategories(query: string): MockCategory[] {
  if (!query || query.trim() === '') {
    return mockCategories;
  }
  const lowerQuery = query.toLowerCase();
  return mockCategories.filter(
    (cat) =>
      cat.label.toLowerCase().includes(lowerQuery) ||
      cat.description?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Search products by query string
 * @param query - Search query
 * @returns Filtered products
 */
export function searchProducts(query: string): MockProduct[] {
  if (!query || query.trim() === '') {
    return mockProducts;
  }
  const lowerQuery = query.toLowerCase();
  return mockProducts.filter(
    (product) =>
      product.title.toLowerCase().includes(lowerQuery) ||
      product.sku.toLowerCase().includes(lowerQuery) ||
      product.category?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Search locations by query string
 * @param query - Search query
 * @returns Filtered locations
 */
export function searchLocations(query: string): MockLocation[] {
  if (!query || query.trim() === '') {
    return mockLocations;
  }
  const lowerQuery = query.toLowerCase();
  return mockLocations.filter(
    (loc) =>
      loc.city.toLowerCase().includes(lowerQuery) ||
      loc.country.toLowerCase().includes(lowerQuery) ||
      loc.code.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get user by ID
 * @param id - User ID
 * @returns User or undefined
 */
export function getUserById(id: string): MockUser | undefined {
  return mockUsers.find((user) => user.id === id);
}

/**
 * Get tag by ID
 * @param id - Tag ID
 * @returns Tag or undefined
 */
export function getTagById(id: string): MockTag | undefined {
  return mockTags.find((tag) => tag.id === id);
}

/**
 * Get category by ID
 * @param id - Category ID
 * @returns Category or undefined
 */
export function getCategoryById(id: string): MockCategory | undefined {
  return mockCategories.find((cat) => cat.id === id);
}

// ============================================================================
// Dependent autocomplete demo data (Jira-style cascade: org → project → ...)
// ----------------------------------------------------------------------------
// Used by the "Demo: Dependent Autocomplete" workflow to exercise the
// `autocomplete.params` feature (sibling form values forwarded to the
// suggestion URL as query parameters). The data is deliberately keyed so each
// level meaningfully filters the next — picking a different organisation
// invalidates the project list, picking a different project invalidates the
// issue-type and assignee lists.
// ============================================================================

/** Jira-style organisation suggestion. */
export interface MockJiraOrg {
  id: string;
  name: string;
  description?: string;
}

/** Jira-style project suggestion. Each project belongs to one organisation. */
export interface MockJiraProject {
  id: string;
  name: string;
  organizationId: string;
  key: string;
}

/** Jira-style issue-type suggestion. Scoped to a specific project. */
export interface MockJiraIssueType {
  id: string;
  name: string;
  projectId: string;
  icon?: string;
}

/** Jira-style assignee suggestion. Scoped to a specific project. */
export interface MockJiraAssignee {
  id: string;
  name: string;
  projectId: string;
  role?: string;
}

export const mockJiraOrgs: MockJiraOrg[] = [
  { id: 'org-acme', name: 'Acme Corp', description: 'Primary product org' },
  { id: 'org-globex', name: 'Globex Industries', description: 'SaaS + ML division' }
];

export const mockJiraProjects: MockJiraProject[] = [
  { id: 'proj-acme-web', name: 'Acme Web Platform', organizationId: 'org-acme', key: 'AWP' },
  { id: 'proj-acme-mobile', name: 'Acme Mobile App', organizationId: 'org-acme', key: 'AMA' },
  { id: 'proj-acme-data', name: 'Acme Data Pipeline', organizationId: 'org-acme', key: 'ADP' },
  { id: 'proj-globex-saas', name: 'Globex SaaS', organizationId: 'org-globex', key: 'GSA' },
  { id: 'proj-globex-ml', name: 'Globex ML Platform', organizationId: 'org-globex', key: 'GML' }
];

export const mockJiraIssueTypes: MockJiraIssueType[] = [
  { id: 'bug', name: 'Bug', projectId: 'proj-acme-web' },
  { id: 'story', name: 'Story', projectId: 'proj-acme-web' },
  { id: 'task', name: 'Task', projectId: 'proj-acme-web' },
  { id: 'epic', name: 'Epic', projectId: 'proj-acme-web' },
  { id: 'bug', name: 'Bug', projectId: 'proj-acme-mobile' },
  { id: 'story', name: 'Story', projectId: 'proj-acme-mobile' },
  { id: 'task', name: 'Task', projectId: 'proj-acme-mobile' },
  { id: 'incident', name: 'Incident', projectId: 'proj-acme-data' },
  { id: 'task', name: 'Task', projectId: 'proj-acme-data' },
  { id: 'change-request', name: 'Change Request', projectId: 'proj-acme-data' },
  { id: 'bug', name: 'Bug', projectId: 'proj-globex-saas' },
  { id: 'story', name: 'Story', projectId: 'proj-globex-saas' },
  { id: 'support', name: 'Support', projectId: 'proj-globex-saas' },
  { id: 'experiment', name: 'Experiment', projectId: 'proj-globex-ml' },
  { id: 'model', name: 'Model', projectId: 'proj-globex-ml' },
  { id: 'dataset', name: 'Dataset', projectId: 'proj-globex-ml' }
];

export const mockJiraAssignees: MockJiraAssignee[] = [
  { id: 'alice', name: 'Alice Johnson', projectId: 'proj-acme-web', role: 'Tech Lead' },
  { id: 'bob', name: 'Bob Smith', projectId: 'proj-acme-web', role: 'Engineer' },
  { id: 'charlie', name: 'Charlie Davis', projectId: 'proj-acme-web', role: 'Engineer' },
  { id: 'dana', name: 'Dana Lee', projectId: 'proj-acme-mobile', role: 'Tech Lead' },
  { id: 'bob', name: 'Bob Smith', projectId: 'proj-acme-mobile', role: 'Engineer' },
  { id: 'eve', name: 'Eve Martinez', projectId: 'proj-acme-data', role: 'Data Engineer' },
  { id: 'frank', name: 'Frank Wilson', projectId: 'proj-acme-data', role: 'Data Lead' },
  { id: 'greg', name: 'Greg Patel', projectId: 'proj-globex-saas', role: 'Engineer' },
  { id: 'hannah', name: 'Hannah Kim', projectId: 'proj-globex-saas', role: 'Tech Lead' },
  { id: 'irene', name: 'Irene Brown', projectId: 'proj-globex-ml', role: 'ML Engineer' },
  { id: 'jacob', name: 'Jacob Chen', projectId: 'proj-globex-ml', role: 'ML Lead' }
];

/** Search Jira orgs by query (no parent filter — orgs sit at the root). */
export function searchJiraOrgs(query: string): MockJiraOrg[] {
  if (!query || query.trim() === '') return mockJiraOrgs;
  const q = query.toLowerCase();
  return mockJiraOrgs.filter(
    (o) => o.name.toLowerCase().includes(q) || o.id.toLowerCase().includes(q)
  );
}

/** Search projects filtered by organisation. Returns empty if org is missing. */
export function searchJiraProjects(query: string, organizationId?: string): MockJiraProject[] {
  if (!organizationId) return [];
  const scoped = mockJiraProjects.filter((p) => p.organizationId === organizationId);
  if (!query || query.trim() === '') return scoped;
  const q = query.toLowerCase();
  return scoped.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.key.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
  );
}

/** Search issue types filtered by project. Returns empty if project is missing. */
export function searchJiraIssueTypes(query: string, projectId?: string): MockJiraIssueType[] {
  if (!projectId) return [];
  const scoped = mockJiraIssueTypes.filter((t) => t.projectId === projectId);
  if (!query || query.trim() === '') return scoped;
  const q = query.toLowerCase();
  return scoped.filter((t) => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
}

/** Search assignees filtered by project. Returns empty if project is missing. */
export function searchJiraAssignees(query: string, projectId?: string): MockJiraAssignee[] {
  if (!projectId) return [];
  const scoped = mockJiraAssignees.filter((a) => a.projectId === projectId);
  if (!query || query.trim() === '') return scoped;
  const q = query.toLowerCase();
  return scoped.filter(
    (a) =>
      a.name.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q) ||
      a.role?.toLowerCase().includes(q)
  );
}

/**
 * Sample autocomplete config schemas for testing
 * These demonstrate various autocomplete configurations
 */
export const sampleAutocompleteSchemas = {
  /**
   * User assignment field - fetches on focus, custom label/value fields
   */
  assignee: {
    type: 'string' as const,
    title: 'Assignee',
    description: 'Select a user to assign this task to',
    format: 'autocomplete' as const,
    autocomplete: {
      url: '/api/flowdrop/autocomplete/users',
      queryParam: 'q',
      minChars: 0,
      debounceMs: 300,
      fetchOnFocus: true,
      labelField: 'label',
      valueField: 'value',
      allowFreeText: false
    }
  },

  /**
   * Tags field - allows free text, searches on type
   */
  tags: {
    type: 'string' as const,
    title: 'Tags',
    description: 'Add tags to categorize this item',
    format: 'autocomplete' as const,
    autocomplete: {
      url: '/api/flowdrop/autocomplete/tags',
      queryParam: 'q',
      minChars: 1,
      debounceMs: 200,
      fetchOnFocus: false,
      labelField: 'label',
      valueField: 'value',
      allowFreeText: true
    }
  },

  /**
   * Category selection - requires 2 characters minimum
   */
  category: {
    type: 'string' as const,
    title: 'Category',
    description: 'Select a category',
    format: 'autocomplete' as const,
    autocomplete: {
      url: '/api/flowdrop/autocomplete/categories',
      queryParam: 'q',
      minChars: 2,
      debounceMs: 300,
      fetchOnFocus: true,
      labelField: 'label',
      valueField: 'value',
      allowFreeText: false
    }
  },

  /**
   * Product search - uses SKU as value, title as label
   */
  product: {
    type: 'string' as const,
    title: 'Product',
    description: 'Search for a product',
    format: 'autocomplete' as const,
    autocomplete: {
      url: '/api/flowdrop/autocomplete/products',
      queryParam: 'q',
      minChars: 2,
      debounceMs: 400,
      fetchOnFocus: false,
      labelField: 'label',
      valueField: 'value',
      allowFreeText: false
    }
  },

  /**
   * Location selector - city/country display, code as value
   */
  location: {
    type: 'string' as const,
    title: 'Location',
    description: 'Select a location',
    format: 'autocomplete' as const,
    autocomplete: {
      url: '/api/flowdrop/autocomplete/locations',
      queryParam: 'q',
      minChars: 0,
      debounceMs: 300,
      fetchOnFocus: true,
      labelField: 'label',
      valueField: 'value',
      allowFreeText: false
    }
  },

  /**
   * Error testing - always fails
   */
  errorTest: {
    type: 'string' as const,
    title: 'Error Test',
    description: 'This field always returns an error (for testing)',
    format: 'autocomplete' as const,
    autocomplete: {
      url: '/api/flowdrop/autocomplete/error',
      queryParam: 'q',
      minChars: 0,
      fetchOnFocus: true
    }
  },

  /**
   * Slow loading test - 2 second delay
   */
  slowTest: {
    type: 'string' as const,
    title: 'Slow Loading Test',
    description: 'This field has a 2 second delay (for testing loading state)',
    format: 'autocomplete' as const,
    autocomplete: {
      url: '/api/flowdrop/autocomplete/slow',
      queryParam: 'q',
      minChars: 0,
      fetchOnFocus: true
    }
  }
};

/**
 * Complete sample form schema with multiple autocomplete fields
 * Use this to test a full form with various autocomplete configurations
 */
export const sampleAutocompleteFormSchema = {
  type: 'object' as const,
  properties: {
    assignee: sampleAutocompleteSchemas.assignee,
    tags: sampleAutocompleteSchemas.tags,
    category: sampleAutocompleteSchemas.category,
    location: sampleAutocompleteSchemas.location,
    description: {
      type: 'string' as const,
      title: 'Description',
      description: 'Additional details',
      format: 'multiline' as const
    }
  },
  required: ['assignee', 'category']
};
