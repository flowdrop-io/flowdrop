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
		id: "user-001",
		name: "Alice Johnson",
		email: "alice.johnson@example.com",
		department: "Engineering",
		role: "Senior Developer"
	},
	{
		id: "user-002",
		name: "Bob Smith",
		email: "bob.smith@example.com",
		department: "Engineering",
		role: "Tech Lead"
	},
	{
		id: "user-003",
		name: "Carol Williams",
		email: "carol.williams@example.com",
		department: "Design",
		role: "UX Designer"
	},
	{
		id: "user-004",
		name: "David Brown",
		email: "david.brown@example.com",
		department: "Product",
		role: "Product Manager"
	},
	{
		id: "user-005",
		name: "Emma Davis",
		email: "emma.davis@example.com",
		department: "Engineering",
		role: "Junior Developer"
	},
	{
		id: "user-006",
		name: "Frank Miller",
		email: "frank.miller@example.com",
		department: "QA",
		role: "QA Engineer"
	},
	{
		id: "user-007",
		name: "Grace Wilson",
		email: "grace.wilson@example.com",
		department: "Marketing",
		role: "Marketing Manager"
	},
	{
		id: "user-008",
		name: "Henry Taylor",
		email: "henry.taylor@example.com",
		department: "Engineering",
		role: "DevOps Engineer"
	},
	{
		id: "user-009",
		name: "Ivy Anderson",
		email: "ivy.anderson@example.com",
		department: "Support",
		role: "Support Lead"
	},
	{
		id: "user-010",
		name: "Jack Thomas",
		email: "jack.thomas@example.com",
		department: "Engineering",
		role: "Backend Developer"
	}
];

/**
 * Mock tags data
 */
export const mockTags: MockTag[] = [
	{ id: "tag-bug", name: "bug", color: "#ef4444", count: 42 },
	{ id: "tag-feature", name: "feature", color: "#22c55e", count: 156 },
	{ id: "tag-enhancement", name: "enhancement", color: "#3b82f6", count: 89 },
	{ id: "tag-documentation", name: "documentation", color: "#a855f7", count: 34 },
	{ id: "tag-urgent", name: "urgent", color: "#f97316", count: 12 },
	{ id: "tag-blocked", name: "blocked", color: "#dc2626", count: 8 },
	{ id: "tag-needs-review", name: "needs-review", color: "#eab308", count: 27 },
	{ id: "tag-in-progress", name: "in-progress", color: "#06b6d4", count: 45 },
	{ id: "tag-testing", name: "testing", color: "#8b5cf6", count: 23 },
	{ id: "tag-ready", name: "ready", color: "#10b981", count: 67 }
];

/**
 * Mock categories data
 */
export const mockCategories: MockCategory[] = [
	{ id: "cat-ai", label: "Artificial Intelligence", description: "AI and ML related nodes" },
	{ id: "cat-data", label: "Data Processing", description: "Data transformation and manipulation" },
	{ id: "cat-integration", label: "Integrations", description: "Third-party service integrations" },
	{ id: "cat-logic", label: "Logic & Control", description: "Conditional and control flow nodes" },
	{ id: "cat-input", label: "Input Sources", description: "Data input and trigger nodes" },
	{ id: "cat-output", label: "Output Destinations", description: "Data output and action nodes" },
	{ id: "cat-transform", label: "Transformations", description: "Data transformation utilities" },
	{ id: "cat-util", label: "Utilities", description: "Helper and utility nodes" }
];

/**
 * Mock products data
 */
export const mockProducts: MockProduct[] = [
	{ sku: "PROD-001", title: "Wireless Keyboard", price: 79.99, category: "Electronics", inStock: true },
	{ sku: "PROD-002", title: "USB-C Hub", price: 49.99, category: "Electronics", inStock: true },
	{ sku: "PROD-003", title: "Monitor Stand", price: 129.99, category: "Furniture", inStock: false },
	{ sku: "PROD-004", title: "Webcam HD", price: 89.99, category: "Electronics", inStock: true },
	{ sku: "PROD-005", title: "Desk Lamp", price: 39.99, category: "Lighting", inStock: true },
	{ sku: "PROD-006", title: "Mouse Pad XL", price: 24.99, category: "Accessories", inStock: true },
	{ sku: "PROD-007", title: "Cable Management Kit", price: 19.99, category: "Accessories", inStock: true },
	{ sku: "PROD-008", title: "Noise Cancelling Headphones", price: 299.99, category: "Audio", inStock: false }
];

/**
 * Mock locations data
 */
export const mockLocations: MockLocation[] = [
	{ code: "NYC", city: "New York", country: "United States", timezone: "America/New_York" },
	{ code: "LON", city: "London", country: "United Kingdom", timezone: "Europe/London" },
	{ code: "TKY", city: "Tokyo", country: "Japan", timezone: "Asia/Tokyo" },
	{ code: "PAR", city: "Paris", country: "France", timezone: "Europe/Paris" },
	{ code: "SYD", city: "Sydney", country: "Australia", timezone: "Australia/Sydney" },
	{ code: "BER", city: "Berlin", country: "Germany", timezone: "Europe/Berlin" },
	{ code: "SFO", city: "San Francisco", country: "United States", timezone: "America/Los_Angeles" },
	{ code: "SIN", city: "Singapore", country: "Singapore", timezone: "Asia/Singapore" },
	{ code: "DXB", city: "Dubai", country: "United Arab Emirates", timezone: "Asia/Dubai" },
	{ code: "TOR", city: "Toronto", country: "Canada", timezone: "America/Toronto" }
];

/**
 * Search users by query string
 * Matches against name and email
 * @param query - Search query
 * @returns Filtered users
 */
export function searchUsers(query: string): MockUser[] {
	if (!query || query.trim() === "") {
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
	if (!query || query.trim() === "") {
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
	if (!query || query.trim() === "") {
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
	if (!query || query.trim() === "") {
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
	if (!query || query.trim() === "") {
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

/**
 * Sample autocomplete config schemas for testing
 * These demonstrate various autocomplete configurations
 */
export const sampleAutocompleteSchemas = {
	/**
	 * User assignment field - fetches on focus, custom label/value fields
	 */
	assignee: {
		type: "string" as const,
		title: "Assignee",
		description: "Select a user to assign this task to",
		format: "autocomplete" as const,
		autocomplete: {
			url: "/api/flowdrop/autocomplete/users",
			queryParam: "q",
			minChars: 0,
			debounceMs: 300,
			fetchOnFocus: true,
			labelField: "label",
			valueField: "value",
			allowFreeText: false
		}
	},

	/**
	 * Tags field - allows free text, searches on type
	 */
	tags: {
		type: "string" as const,
		title: "Tags",
		description: "Add tags to categorize this item",
		format: "autocomplete" as const,
		autocomplete: {
			url: "/api/flowdrop/autocomplete/tags",
			queryParam: "q",
			minChars: 1,
			debounceMs: 200,
			fetchOnFocus: false,
			labelField: "label",
			valueField: "value",
			allowFreeText: true
		}
	},

	/**
	 * Category selection - requires 2 characters minimum
	 */
	category: {
		type: "string" as const,
		title: "Category",
		description: "Select a category",
		format: "autocomplete" as const,
		autocomplete: {
			url: "/api/flowdrop/autocomplete/categories",
			queryParam: "q",
			minChars: 2,
			debounceMs: 300,
			fetchOnFocus: true,
			labelField: "label",
			valueField: "value",
			allowFreeText: false
		}
	},

	/**
	 * Product search - uses SKU as value, title as label
	 */
	product: {
		type: "string" as const,
		title: "Product",
		description: "Search for a product",
		format: "autocomplete" as const,
		autocomplete: {
			url: "/api/flowdrop/autocomplete/products",
			queryParam: "q",
			minChars: 2,
			debounceMs: 400,
			fetchOnFocus: false,
			labelField: "label",
			valueField: "value",
			allowFreeText: false
		}
	},

	/**
	 * Location selector - city/country display, code as value
	 */
	location: {
		type: "string" as const,
		title: "Location",
		description: "Select a location",
		format: "autocomplete" as const,
		autocomplete: {
			url: "/api/flowdrop/autocomplete/locations",
			queryParam: "q",
			minChars: 0,
			debounceMs: 300,
			fetchOnFocus: true,
			labelField: "label",
			valueField: "value",
			allowFreeText: false
		}
	},

	/**
	 * Error testing - always fails
	 */
	errorTest: {
		type: "string" as const,
		title: "Error Test",
		description: "This field always returns an error (for testing)",
		format: "autocomplete" as const,
		autocomplete: {
			url: "/api/flowdrop/autocomplete/error",
			queryParam: "q",
			minChars: 0,
			fetchOnFocus: true
		}
	},

	/**
	 * Slow loading test - 2 second delay
	 */
	slowTest: {
		type: "string" as const,
		title: "Slow Loading Test",
		description: "This field has a 2 second delay (for testing loading state)",
		format: "autocomplete" as const,
		autocomplete: {
			url: "/api/flowdrop/autocomplete/slow",
			queryParam: "q",
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
	type: "object" as const,
	properties: {
		assignee: sampleAutocompleteSchemas.assignee,
		tags: sampleAutocompleteSchemas.tags,
		category: sampleAutocompleteSchemas.category,
		location: sampleAutocompleteSchemas.location,
		description: {
			type: "string" as const,
			title: "Description",
			description: "Additional details",
			format: "multiline" as const
		}
	},
	required: ["assignee", "category"]
};
