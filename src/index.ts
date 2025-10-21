#!/usr/bin/env node
import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

// Constants
const M365_API_BASE_V2 = 'https://www.microsoft.com/releasecommunications/api/v2/m365';
const API_TIMEOUT_MS = 30000; // 30 seconds
const MAX_CACHE_AGE_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RESULTS_LIMIT = 1000; // Prevent excessive data retrieval
const SERVER_VERSION = '1.0.0';

// Types for API responses
interface RoadmapItem {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  platform?: string[];
  releasePhase?: string;
  generalAvailability?: string;
  publicPreview?: string;
  updated?: string;
  [key: string]: any;
}

interface RoadmapResponse {
  value: RoadmapItem[];
}

interface CacheEntry {
  data: RoadmapItem[];
  timestamp: number;
  filter?: string;
}

interface MCPError {
  code: number;
  message: string;
  data?: any;
}

// Simple in-memory cache
const cache = new Map<string, CacheEntry>();

// Helper: Sanitize OData filter to prevent injection
function sanitizeODataFilter(filter: string): string {
  // Remove potentially dangerous characters and validate structure
  const sanitized = filter
    .replace(/[;\\]/g, '') // Remove semicolons and backslashes
    .trim();
  
  // Basic validation: ensure it doesn't contain SQL-like keywords that shouldn't be there
  const dangerousPatterns = /\b(drop|delete|insert|update|exec|execute|script|javascript)\b/i;
  if (dangerousPatterns.test(sanitized)) {
    throw new Error('Invalid filter: potentially dangerous keywords detected');
  }
  
  return sanitized;
}

// Helper: Create structured error
function createMCPError(message: string, code: number = -32603, data?: any): MCPError {
  return { code, message, data };
}

// Helper: Fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout: number = API_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

const server = new McpServer({
  name: 'microsoft365-roadmap',
  version: SERVER_VERSION,
  description: 'MCP server for Microsoft 365 Roadmap data with OData filtering support',
  icons: [{
    src: 'https://www.microsoft.com/favicon.ico',
    sizes: ['32x32'],
    mimeType: 'image/x-icon'
  }],
  websiteUrl: 'https://www.microsoft.com/microsoft-365/roadmap',
  vendor: {
    name: 'Microsoft 365 Roadmap MCP',
    url: 'https://github.com/ollimenzel/roadmap-mcp-server'
  }
});

// Helper function to fetch roadmap data with caching and timeout
async function fetchRoadmapItemsV2(filter?: string): Promise<RoadmapItem[]> {
  // Sanitize filter if provided
  const sanitizedFilter = filter ? sanitizeODataFilter(filter) : undefined;
  const cacheKey = sanitizedFilter || 'all';
  
  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < MAX_CACHE_AGE_MS) {
    console.log(`Cache hit for filter: ${cacheKey}`);
    return cached.data;
  }
  
  try {
    let url = M365_API_BASE_V2;
    if (sanitizedFilter) {
      url += `?$filter=${encodeURIComponent(sanitizedFilter)}`;
    }
    
    console.log(`Fetching from API: ${url}`);
    
    const response = await fetchWithTimeout(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': `MCP-M365-Roadmap-Server/${SERVER_VERSION}`,
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json() as RoadmapResponse;
    const items = data.value || [];
    
    // Update cache
    cache.set(cacheKey, {
      data: items,
      timestamp: Date.now(),
      filter: sanitizedFilter
    });
    
    // Cleanup old cache entries (keep max 50 entries)
    if (cache.size > 50) {
      const keys = Array.from(cache.keys());
      if (keys.length > 0) {
        cache.delete(keys[0]);
      }
    }
    
    console.log(`Fetched ${items.length} items from API`);
    return items;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error fetching roadmap items: ${errorMessage}`, {
      filter: sanitizedFilter,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

// Tool: Get all roadmap items
server.registerTool(
  'get_roadmap_items',
  {
    title: 'Get Microsoft 365 Roadmap Items',
    description: 'Fetches Microsoft 365 roadmap items from the official API with optional OData filtering and pagination. Results are cached for 5 minutes.',
    inputSchema: {
      limit: z.number().min(1).max(MAX_RESULTS_LIMIT).optional().describe('Maximum number of items to return (default: 100, max: 1000)'),
      offset: z.number().min(0).optional().describe('Number of items to skip for pagination (default: 0)'),
      filter: z.string().max(1000).optional().describe('OData filter expression (e.g., "status eq \'Launched\'" or "products/any(p:p eq \'Microsoft Teams\')")')
    }
  },
  async ({ limit = 100, offset = 0, filter }) => {
    try {
      // Validate inputs
      const validatedLimit = Math.min(limit, MAX_RESULTS_LIMIT);
      const validatedOffset = Math.max(0, offset);
      
      const items = await fetchRoadmapItemsV2(filter);
      const paginatedItems = items.slice(validatedOffset, validatedOffset + validatedLimit);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            total: items.length,
            returned: paginatedItems.length,
            offset: validatedOffset,
            limit: validatedLimit,
            hasMore: (validatedOffset + validatedLimit) < items.length,
            items: paginatedItems
          }, null, 2)
        }]
      };
    } catch (error) {
      const mcpError = createMCPError(
        error instanceof Error ? error.message : 'Failed to fetch roadmap items',
        -32000,
        { filter, limit, offset }
      );
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(mcpError, null, 2)
        }],
        isError: true
      };
    }
  }
);

// Tool: Search roadmap items by keyword
server.registerTool(
  'search_roadmap',
  {
    title: 'Search Microsoft 365 Roadmap',
    description: 'Search for roadmap items by keyword in title or description',
    inputSchema: {
      keyword: z.string().describe('Keyword to search for in title and description'),
      limit: z.number().optional().describe('Maximum number of results (default: 20)')
    }
  },
  async ({ keyword, limit = 20 }) => {
    try {
      // Use v2 API, no filter for keyword, get all and filter client-side
      const items = await fetchRoadmapItemsV2();
      const searchTerm = keyword.toLowerCase();
      const filteredItems = items
        .filter(item => 
          item.title?.toLowerCase().includes(searchTerm) ||
          item.description?.toLowerCase().includes(searchTerm)
        )
        .slice(0, limit);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            keyword,
            found: filteredItems.length,
            items: filteredItems
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// Tool: Get roadmap item by ID
server.registerTool(
  'get_roadmap_item',
  {
    title: 'Get Roadmap Item by ID',
    description: 'Fetches a specific Microsoft 365 roadmap item by its ID (v2 API)',
    inputSchema: {
      id: z.string().describe('The ID of the roadmap item')
    }
  },
  async ({ id }) => {
    try {
      // Use v2 API with filter
      const filter = `id eq ${id}`;
      const items = await fetchRoadmapItemsV2(filter);
      const item = items[0];
      if (!item) {
        return {
          content: [{
            type: 'text',
            text: `No roadmap item found with ID: ${id}`
          }],
          isError: true
        };
      }
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(item, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// Tool: Filter by product (using OData array filter)
server.registerTool(
  'filter_by_product',
  {
    title: 'Filter by Product',
    description: 'Get roadmap items for a specific Microsoft product. Common products: "Microsoft Copilot (Microsoft 365)", "Microsoft Teams", "SharePoint", "Exchange", "OneDrive"',
    inputSchema: {
      product: z.string().min(1).max(200).describe('Product name to filter by'),
      limit: z.number().min(1).max(MAX_RESULTS_LIMIT).optional().describe('Maximum number of items to return (default: 100, max: 1000)')
    }
  },
  async ({ product, limit = 100 }) => {
    try {
      // Escape single quotes to prevent injection
      const escapedProduct = product.replace(/'/g, "''");
      const filter = `products/any(p:p eq '${escapedProduct}')`;
      
      const items = await fetchRoadmapItemsV2(filter);
      const validatedLimit = Math.min(limit, MAX_RESULTS_LIMIT);
      const limitedItems = items.slice(0, validatedLimit);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            product,
            total: items.length,
            returned: limitedItems.length,
            hasMore: limitedItems.length < items.length,
            items: limitedItems
          }, null, 2)
        }]
      };
    } catch (error) {
      const mcpError = createMCPError(
        error instanceof Error ? error.message : 'Failed to filter by product',
        -32000,
        { product, limit }
      );
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(mcpError, null, 2)
        }],
        isError: true
      };
    }
  }
);

// Tool: Filter by release ring (OData array filter)
server.registerTool(
  'filter_by_release_phase',
  {
    title: 'Filter by Release Phase',
    description: 'Get roadmap items filtered by release ring/phase ("General Availability", "Public Preview", "In Development")',
    inputSchema: {
      phase: z.enum(['General Availability', 'Public Preview', 'In Development', 'Rolling Out']).describe('Release phase to filter by'),
      limit: z.number().optional().describe('Maximum number of items to return (default: 100)')
    }
  },
  async ({ phase, limit = 100 }) => {
    try {
      const filter = `releaseRings/any(r:r eq '${phase}')`;
      const items = await fetchRoadmapItemsV2(filter);
      const limitedItems = items.slice(0, limit);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            phase,
            total: items.length,
            returned: limitedItems.length,
            items: limitedItems
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// Tool: Filter by status
server.registerTool(
  'filter_by_status',
  {
    title: 'Filter by Status',
    description: 'Get roadmap items by their current status',
    inputSchema: {
      status: z.enum(['In development', 'Rolling out', 'Launched']).describe('Status to filter by'),
      limit: z.number().optional().describe('Maximum number of items to return (default: 100)')
    }
  },
  async ({ status, limit = 100 }) => {
    try {
      const filter = `status eq '${status}'`;
      const items = await fetchRoadmapItemsV2(filter);
      const limitedItems = items.slice(0, limit);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status,
            total: items.length,
            returned: limitedItems.length,
            items: limitedItems
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// Tool: Filter by date range
server.registerTool(
  'filter_by_date',
  {
    title: 'Filter by Release Date',
    description: 'Get roadmap items by GA or preview date (format: YYYY-MM, e.g. "2025-10" for October 2025)',
    inputSchema: {
      date: z.string().describe('Date in format YYYY-MM, e.g. "2025-10"'),
      dateType: z.enum(['generalAvailability', 'preview']).optional().describe('Filter by GA date or preview date (default: generalAvailability)'),
      limit: z.number().optional().describe('Maximum number of items to return (default: 100)')
    }
  },
  async ({ date, dateType = 'generalAvailability', limit = 100 }) => {
    try {
      const field = dateType === 'generalAvailability' ? 'generalAvailabilityDate' : 'previewAvailabilityDate';
      const filter = `${field} eq '${date}'`;
      const items = await fetchRoadmapItemsV2(filter);
      const limitedItems = items.slice(0, limit);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            date,
            dateType,
            total: items.length,
            returned: limitedItems.length,
            items: limitedItems
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// Tool: Advanced filter (for complex OData queries)
server.registerTool(
  'filter_roadmap',
  {
    title: 'Advanced Filter',
    description: 'Use custom OData filter expressions. Examples: "products/any(p:p eq \'Microsoft Teams\') and status eq \'Launched\'", "generalAvailabilityDate ge \'2025-10\'"',
    inputSchema: {
      filter: z.string().describe('OData filter expression'),
      limit: z.number().optional().describe('Maximum number of items to return (default: 100)')
    }
  },
  async ({ filter, limit = 100 }) => {
    try {
      const items = await fetchRoadmapItemsV2(filter);
      const limitedItems = items.slice(0, limit);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            filter,
            total: items.length,
            returned: limitedItems.length,
            items: limitedItems
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// Metrics tracking
const metrics = {
  requests: { total: 0, successful: 0, failed: 0 },
  tools: new Map<string, { calls: number, errors: number }>(),
  apiCalls: { total: 0, cached: 0, failed: 0 },
  uptime: Date.now()
};

// Helper: Track tool usage
function trackToolCall(toolName: string, success: boolean) {
  const toolMetrics = metrics.tools.get(toolName) || { calls: 0, errors: 0 };
  toolMetrics.calls++;
  if (!success) {
    toolMetrics.errors++;
  }
  metrics.tools.set(toolName, toolMetrics);
}

// Set up Express server
const app = express();
app.use(express.json());

// Enhanced CORS configuration for Copilot Studio
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'Mcp-Session-Id'],
  exposedHeaders: ['Mcp-Session-Id'],
  credentials: false
}));

// Handle preflight requests explicitly
app.options('*', cors());

// Request ID generator
let requestCounter = 0;

// Add request logging with request ID
app.use((req, res, next) => {
  const requestId = `req-${Date.now()}-${++requestCounter}`;
  (req as any).requestId = requestId;
  
  console.log(JSON.stringify({
    requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent')
  }));
  
  next();
});

// Cache management endpoint (for debugging/ops)
app.post('/cache/clear', (req, res) => {
  const size = cache.size;
  cache.clear();
  console.log(JSON.stringify({
    action: 'cache_cleared',
    previousSize: size,
    timestamp: new Date().toISOString()
  }));
  res.json({ message: 'Cache cleared', previousSize: size });
});

app.get('/cache/stats', (req, res) => {
  const stats = {
    size: cache.size,
    entries: Array.from(cache.entries()).map(([key, value]) => ({
      filter: key,
      itemCount: value.data.length,
      age: Date.now() - value.timestamp,
      ageMinutes: Math.floor((Date.now() - value.timestamp) / 60000)
    }))
  };
  res.json(stats);
});

// MCP endpoint with enhanced error handling and metrics
app.post('/mcp', async (req, res) => {
  const requestId = (req as any).requestId;
  metrics.requests.total++;
  
  try {
    const method = req.body?.method;
    const toolName = req.body?.params?.name;
    
    console.log(JSON.stringify({
      requestId,
      event: 'mcp_request',
      method,
      toolName,
      hasParams: !!req.body?.params,
      timestamp: new Date().toISOString()
    }));

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });

    res.on('close', () => {
      transport.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    
    metrics.requests.successful++;
    if (toolName) {
      trackToolCall(toolName, true);
    }
  } catch (error) {
    metrics.requests.failed++;
    const toolName = req.body?.params?.name;
    if (toolName) {
      trackToolCall(toolName, false);
    }
    
    console.error(JSON.stringify({
      requestId,
      event: 'mcp_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }));
    
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: createMCPError(
          error instanceof Error ? error.message : 'Internal server error',
          -32603,
          { requestId }
        ),
        id: req.body?.id || null
      });
    }
  }
});

// Health check endpoint with details
app.get('/health', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - metrics.uptime) / 1000);
  res.json({ 
    status: 'healthy', 
    server: 'microsoft365-roadmap-mcp',
    version: SERVER_VERSION,
    uptime: {
      seconds: uptimeSeconds,
      formatted: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m`
    },
    cache: {
      size: cache.size,
      maxAge: `${MAX_CACHE_AGE_MS / 1000}s`
    }
  });
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - metrics.uptime) / 1000);
  res.json({
    uptime: uptimeSeconds,
    requests: metrics.requests,
    tools: Object.fromEntries(metrics.tools),
    api: metrics.apiCalls,
    cache: {
      size: cache.size,
      maxEntries: 50,
      maxAge: MAX_CACHE_AGE_MS
    },
    timestamp: new Date().toISOString()
  });
});

// Simple test endpoint for Copilot Studio connection
app.get('/test', (req, res) => {
  res.json({
    message: 'MCP Server is running',
    server: 'microsoft365-roadmap-mcp',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      mcp: '/mcp (POST)',
      test: '/test (GET)'
    },
    timestamp: new Date().toISOString()
  });
});

// Root endpoint with info
app.get('/', (req, res) => {
  res.json({
    name: 'Microsoft 365 Roadmap MCP Server',
    version: SERVER_VERSION,
    description: 'Model Context Protocol server for Microsoft 365 Roadmap data with OData filtering',
    endpoints: {
      mcp: {
        url: '/mcp',
        method: 'POST',
        description: 'Main MCP endpoint - requires Accept: application/json, text/event-stream header'
      },
      health: {
        url: '/health',
        method: 'GET',
        description: 'Health check endpoint with server status'
      },
      metrics: {
        url: '/metrics',
        method: 'GET',
        description: 'Server metrics and statistics'
      },
      test: {
        url: '/test',
        method: 'GET',
        description: 'Simple test endpoint'
      },
      cache: {
        stats: '/cache/stats (GET) - Cache statistics',
        clear: '/cache/clear (POST) - Clear cache'
      }
    },
    tools: 8,
    features: [
      'OData v2 filtering',
      'Response caching (5min)',
      'Request timeout (30s)',
      'Input sanitization',
      'Structured logging',
      'Metrics tracking'
    ],
    usage: 'Use this URL in Copilot Studio: https://roadmap-mcp-server.azurewebsites.net/mcp',
    documentation: 'https://github.com/ollimenzel/roadmap-mcp-server'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const server_instance = app.listen(PORT, () => {
  console.log(JSON.stringify({
    event: 'server_started',
    port: PORT,
    version: SERVER_VERSION,
    environment: process.env.NODE_ENV || 'development',
    mcpEndpoint: `http://localhost:${PORT}/mcp`,
    healthEndpoint: `http://localhost:${PORT}/health`,
    timestamp: new Date().toISOString()
  }));
}).on('error', (error) => {
  console.error(JSON.stringify({
    event: 'server_error',
    error: error.message,
    timestamp: new Date().toISOString()
  }));
  process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(JSON.stringify({
    event: 'shutdown_initiated',
    signal,
    timestamp: new Date().toISOString()
  }));
  
  server_instance.close(() => {
    console.log(JSON.stringify({
      event: 'server_closed',
      timestamp: new Date().toISOString()
    }));
    
    // Close any pending connections
    cache.clear();
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error(JSON.stringify({
      event: 'forced_shutdown',
      reason: 'Timeout',
      timestamp: new Date().toISOString()
    }));
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
