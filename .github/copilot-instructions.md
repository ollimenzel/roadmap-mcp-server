# MCP Server for Microsoft 365 Roadmap

This is a Model Context Protocol (MCP) server that fetches Microsoft 365 roadmap items from the official Microsoft Release Communications API v2.

## Project Structure

- TypeScript-based MCP server
- Fetches data from https://www.microsoft.com/releasecommunications/api/v2/m365
- OData v2 support with flexible filters
- Deployable to Azure or GitHub via Docker/GitHub Actions
- Compatible with Copilot Studio
- Follows MCP best practices

## Implemented Features

✅ **MCP Server** with 8 tools:
- `get_roadmap_items` - Fetches all roadmap items with optional OData filters and pagination
- `search_roadmap` - Search items by keyword (client-side filtering)
- `get_roadmap_item` - Get specific item by ID using OData filter
- `filter_by_product` - Filter by product name using OData array filters (e.g., "Microsoft Copilot (Microsoft 365)")
- `filter_by_release_phase` - Filter by release ring/phase using OData array filters
- `filter_by_status` - Filter by current status ("In development", "Rolling out", "Launched")
- `filter_by_date` - Filter by GA or preview date (format: YYYY-MM)
- `filter_roadmap` - Advanced tool for custom OData filter expressions

✅ **HTTP/JSON REST API** on Express
✅ **OData v2 API** with proper $filter parameter syntax
✅ **Array Filters** for products, platforms, releaseRings using `any()` syntax
✅ **Docker support** with Dockerfile
✅ **Azure deployment** via GitHub Actions
✅ **GitHub CI/CD** with build workflow
✅ **Complete documentation** in README.md with OData filter examples
✅ **MCP Best Practices** compliance

## API Architecture

### OData v2 Filter Syntax

**Array Filters (for arrays like products, platforms, releaseRings):**
```
products/any(p:p eq 'Microsoft Copilot (Microsoft 365)')
platforms/any(p:p eq 'Web')
releaseRings/any(r:r eq 'General Availability')
```

**Comparison Operators:**
```
status eq 'Launched'
generalAvailabilityDate eq '2025-10'
generalAvailabilityDate ge '2025-10'  (greater or equal)
```

**Logical Operators:**
```
products/any(p:p eq 'Microsoft Teams') and status eq 'Launched'
status eq 'Rolling out' or status eq 'Launched'
```

### Available Fields

- `id` (number): Roadmap Item ID
- `title` (string): Item title
- `description` (string): Description
- `status` (string): "In development", "Rolling out", "Launched"
- `products` (array): List of affected products
- `platforms` (array): List of platforms
- `releaseRings` (array): "General Availability", "Public Preview", etc.
- `cloudInstances` (array): Cloud instances
- `generalAvailabilityDate` (string): GA date (YYYY-MM)
- `previewAvailabilityDate` (string): Preview date (YYYY-MM)
- `created` (datetime): Creation date
- `modified` (datetime): Modification date
- `availabilities` (array): Detailed availability information

## Usage

### Local Development
```bash
npm install
npm run build
npm start
```

Server runs on http://localhost:3000/mcp

### Example Queries

**All Copilot items for October 2025:**
```json
{
  "tool": "filter_roadmap",
  "filter": "products/any(p:p eq 'Microsoft Copilot (Microsoft 365)') and generalAvailabilityDate eq '2025-10'"
}
```

**Teams items in Public Preview:**
```json
{
  "tool": "filter_roadmap",
  "filter": "products/any(p:p eq 'Microsoft Teams') and releaseRings/any(r:r eq 'Public Preview')"
}
```

### Test in Copilot Studio
1. Deploy to Azure or run locally
2. Add as HTTP MCP server in Copilot Studio
3. Use the 8 available tools

### Deploy to Azure
- Push to `main` branch triggers automatic Azure deployment
- Configure `AZURE_WEBAPP_PUBLISH_PROFILE` secret in GitHub

## Architecture

```
src/
  └── index.ts          # Main MCP server with Express and 8 tools
build/                  # Compiled TypeScript
.github/workflows/      # CI/CD pipelines
  ├── azure-deploy.yml  # Azure deployment
  └── build.yml         # Build & test
```

## MCP Best Practices Implemented

1. ✅ **Clear Tool Descriptions**: Each tool has detailed descriptions and parameter documentation
2. ✅ **Input Validation**: Using Zod schemas for type-safe input validation
3. ✅ **Error Handling**: Comprehensive error handling with meaningful error messages
4. ✅ **Pagination Support**: Limit and offset parameters for large datasets
5. ✅ **Flexible Filtering**: Multiple specialized tools + advanced filter tool for power users
6. ✅ **Proper HTTP Headers**: Correct Accept headers for MCP protocol
7. ✅ **Health Checks**: /health endpoint for monitoring
8. ✅ **Type Safety**: Full TypeScript implementation with proper types
9. ✅ **Documentation**: Comprehensive README with examples
10. ✅ **Production Ready**: Docker support, Azure deployment, CI/CD
