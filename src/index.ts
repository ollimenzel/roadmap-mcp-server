#!/usr/bin/env node
import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

// Microsoft 365 Roadmap API endpoint
const M365_API_BASE = 'https://www.microsoft.com/releasecommunications/api/v1/m365';

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

const M365_API_BASE_V2 = 'https://www.microsoft.com/releasecommunications/api/v2/m365';

const server = new McpServer({
  name: 'microsoft365-roadmap',
  version: '1.0.0',
  icons: [{
    src: 'https://www.microsoft.com/favicon.ico',
    sizes: ['32x32'],
    mimeType: 'image/x-icon'
  }],
  websiteUrl: 'https://www.microsoft.com/microsoft-365/roadmap'
});

// Helper function to fetch roadmap data with flexible filter
async function fetchRoadmapItemsV2(filter?: string): Promise<RoadmapItem[]> {
  try {
    let url = M365_API_BASE_V2;
    if (filter) {
      // Use proper OData $filter parameter
      url += `?$filter=${encodeURIComponent(filter)}`;
    }
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MCP-M365-Roadmap-Server/1.0'
      }
    });
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as RoadmapResponse;
    return data.value || [];
  } catch (error) {
    console.error('Error fetching roadmap items:', error);
    throw error;
  }
}

// Tool: Get all roadmap items
server.registerTool(
  'get_roadmap_items',
  {
    title: 'Get Microsoft 365 Roadmap Items',
    description: 'Fetches all Microsoft 365 roadmap items from the official API (v2)',
    inputSchema: {
      limit: z.number().optional().describe('Maximum number of items to return (default: 100)'),
      offset: z.number().optional().describe('Number of items to skip (default: 0)'),
      filter: z.string().optional().describe('Custom filter string, e.g. "category eq Collaboration"')
    }
  },
  async ({ limit = 100, offset = 0, filter }) => {
    try {
      const items = await fetchRoadmapItemsV2(filter);
      const paginatedItems = items.slice(offset, offset + limit);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            total: items.length,
            returned: paginatedItems.length,
            offset,
            items: paginatedItems
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
    description: 'Get roadmap items for a specific Microsoft product (e.g., "Microsoft Copilot (Microsoft 365)", "Microsoft Teams", "SharePoint")',
    inputSchema: {
      product: z.string().describe('Product name to filter by, e.g. "Microsoft Copilot (Microsoft 365)"'),
      limit: z.number().optional().describe('Maximum number of items to return (default: 100)')
    }
  },
  async ({ product, limit = 100 }) => {
    try {
      // Use OData array filter syntax
      const filter = `products/any(p:p eq '${product}')`;
      const items = await fetchRoadmapItemsV2(filter);
      const limitedItems = items.slice(0, limit);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            product,
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

// Set up Express server
const app = express();
app.use(express.json());
app.use(cors({
  origin: '*',
  exposedHeaders: ['Mcp-Session-Id']
}));

// MCP endpoint
app.post('/mcp', async (req, res) => {
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });

    res.on('close', () => {
      transport.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error'
        },
        id: null
      });
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', server: 'microsoft365-roadmap-mcp' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Microsoft 365 Roadmap MCP Server running on http://localhost:${PORT}/mcp`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
}).on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});
