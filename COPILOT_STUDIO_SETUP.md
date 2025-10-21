# Copilot Studio Integration - Microsoft 365 Roadmap MCP Server

## 🔗 Server URL
```
https://roadmap-mcp-server.azurewebsites.net/mcp
```

## 📋 Setup in Copilot Studio

### Method 1: Direct MCP Connection

1. **Open Copilot Studio Connection Manager**
   - Navigate to your Copilot Studio instance
   - Go to Settings → Connections → Model Context Protocol

2. **Add New MCP Server**
   - Click "Add Connection" or "New MCP Server"
   - Enter the following details:

   **Server Details:**
   - **Name:** Microsoft 365 Roadmap
   - **URL:** `https://roadmap-mcp-server.azurewebsites.net/mcp`
   - **Method:** POST
   - **Authentication:** None (public endpoint)

   **Headers (if required):**
   ```
   Content-Type: application/json
   Accept: application/json, text/event-stream
   ```

3. **Test Connection**
   - Click "Test Connection" or "Verify"
   - You should see: "Connection successful"
   - Available tools should be listed (8 tools)

### Method 2: HTTP Connector (Alternative)

If direct MCP connection doesn't work, use HTTP connector:

1. **Create HTTP Connection**
   - Go to Settings → Connections → HTTP
   - Click "New Connection"

2. **Configure Connection**
   - **Base URL:** `https://roadmap-mcp-server.azurewebsites.net`
   - **Authentication:** None

3. **Create Action for MCP**
   - Endpoint: `/mcp`
   - Method: POST
   - Headers:
     ```json
     {
       "Content-Type": "application/json",
       "Accept": "application/json, text/event-stream"
     }
     ```
   - Body template:
     ```json
     {
       "jsonrpc": "2.0",
       "id": 1,
       "method": "tools/list"
     }
     ```

## 🧪 Test Endpoints

Before connecting from Copilot Studio, verify the server is running:

### Health Check
```bash
curl https://roadmap-mcp-server.azurewebsites.net/health
```
Expected response:
```json
{
  "status": "healthy",
  "server": "microsoft365-roadmap-mcp"
}
```

### Server Info
```bash
curl https://roadmap-mcp-server.azurewebsites.net/
```

### MCP Tools List
```bash
curl -X POST https://roadmap-mcp-server.azurewebsites.net/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## 🛠️ Available Tools

Once connected, you'll have access to 8 tools:

1. **get_roadmap_items** - Fetch all roadmap items with pagination
2. **search_roadmap** - Search items by keyword
3. **get_roadmap_item** - Get specific item by ID
4. **filter_by_product** - Filter by Microsoft product
5. **filter_by_release_phase** - Filter by release phase (GA, Preview, etc.)
6. **filter_by_status** - Filter by status (In development, Rolling out, Launched)
7. **filter_by_date** - Filter by GA or preview date
8. **filter_roadmap** - Advanced custom OData filtering

## 🔍 Example Queries in Copilot Studio

After connection, you can ask:
- "What Microsoft 365 features are coming in October 2025?"
- "Show me all Copilot roadmap items"
- "Which Teams features are in public preview?"
- "Find roadmap item 497417"
- "What's launching next month?"

## ⚠️ Troubleshooting

### Connection Failed
- Verify server is running: `curl https://roadmap-mcp-server.azurewebsites.net/health`
- Check CORS is enabled (it is by default)
- Ensure you're using the `/mcp` endpoint, not just the root URL

### No Tools Visible
- Try the test endpoint first: `curl https://roadmap-mcp-server.azurewebsites.net/test`
- Verify MCP endpoint works: Test with the tools/list curl command above
- Check Copilot Studio logs for error messages

### Authentication Errors
- This server does NOT require authentication
- If Copilot Studio asks for credentials, select "No Authentication" or "Anonymous"

### CORS Errors
- The server has CORS enabled for all origins (`*`)
- If you see CORS errors, it might be a browser/client issue, not the server

## 📊 Server Logs

To view server logs in Azure:
```bash
az webapp log tail --name roadmap-mcp-server --resource-group rg-roadmap-mcp
```

Or via Azure Portal:
1. Go to: https://portal.azure.com
2. Search for "roadmap-mcp-server"
3. Click "Log stream" in the left menu

## 🔄 Server Status

- **URL:** https://roadmap-mcp-server.azurewebsites.net
- **Status:** Running (Always On enabled)
- **Region:** West Europe
- **Plan:** Basic B1
- **Auto-deployment:** Configured via GitHub Actions

## 📚 Additional Resources

- **GitHub Repository:** https://github.com/ollimenzel/roadmap-mcp-server
- **MCP Protocol:** https://modelcontextprotocol.io/
- **Microsoft 365 Roadmap:** https://www.microsoft.com/microsoft-365/roadmap
