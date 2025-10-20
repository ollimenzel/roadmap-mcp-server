# Microsoft 365 Roadmap MCP Server

Ein Model Context Protocol (MCP) Server, der Microsoft 365 Roadmap Items von der offiziellen Microsoft Release Communications API abruft und für Copilot Studio bereitstellt.

## 🚀 Features

- **8 MCP Tools** zum Abrufen und Durchsuchen von Microsoft 365 Roadmap Items
- **OData v2 API** Support mit flexiblen Filtern
- **REST API** über HTTP/JSON
- **Deployment-ready** für Azure und GitHub
- **Copilot Studio kompatibel**
- **MCP Best Practices** konform

## 📋 Verfügbare Tools

### 1. `get_roadmap_items`
Ruft alle Microsoft 365 Roadmap Items ab mit optionalen OData Filtern.

**Parameter:**
- `limit` (optional): Maximale Anzahl an Items (Standard: 100)
- `offset` (optional): Anzahl zu überspringender Items (Standard: 0)
- `filter` (optional): OData Filter String (z.B. "products/any(p:p eq 'Microsoft Teams')")

**Beispiel:**
```json
{
  "limit": 50,
  "filter": "status eq 'Launched'"
}
```

### 2. `search_roadmap`
Durchsucht Roadmap Items nach Stichwörtern (client-seitig).

**Parameter:**
- `keyword`: Suchbegriff für Titel und Beschreibung
- `limit` (optional): Maximale Anzahl an Ergebnissen (Standard: 20)

**Beispiel:**
```json
{
  "keyword": "Copilot",
  "limit": 10
}
```

### 3. `get_roadmap_item`
Ruft ein spezifisches Roadmap Item nach ID ab.

**Parameter:**
- `id`: Die ID des Roadmap Items

**Beispiel:**
```json
{
  "id": "497417"
}
```

### 4. `filter_by_product`
Filtert Items nach Microsoft Produkt (verwendet OData Array-Filter).

**Parameter:**
- `product`: Produktname (z.B. "Microsoft Copilot (Microsoft 365)", "Microsoft Teams", "SharePoint")
- `limit` (optional): Maximale Anzahl an Items (Standard: 100)

**Beispiel:**
```json
{
  "product": "Microsoft Copilot (Microsoft 365)",
  "limit": 50
}
```

### 5. `filter_by_release_phase`
Filtert Items nach Release Ring/Phase.

**Parameter:**
- `phase`: Release-Phase ("General Availability", "Public Preview", "In Development", "Rolling Out")
- `limit` (optional): Maximale Anzahl an Items (Standard: 100)

**Beispiel:**
```json
{
  "phase": "General Availability",
  "limit": 20
}
```

### 6. `filter_by_status`
Filtert Items nach aktuellem Status.

**Parameter:**
- `status`: Status ("In development", "Rolling out", "Launched")
- `limit` (optional): Maximale Anzahl an Items (Standard: 100)

**Beispiel:**
```json
{
  "status": "Rolling out"
}
```

### 7. `filter_by_date`
Filtert Items nach GA oder Preview Datum.

**Parameter:**
- `date`: Datum im Format YYYY-MM (z.B. "2025-10" für Oktober 2025)
- `dateType` (optional): "generalAvailability" oder "preview" (Standard: "generalAvailability")
- `limit` (optional): Maximale Anzahl an Items (Standard: 100)

**Beispiel:**
```json
{
  "date": "2025-10",
  "dateType": "generalAvailability"
}
```

### 8. `filter_roadmap` (Advanced)
Ermöglicht komplexe OData Filter Queries.

**Parameter:**
- `filter`: OData Filter Expression
- `limit` (optional): Maximale Anzahl an Items (Standard: 100)

**Beispiele:**
```json
{
  "filter": "products/any(p:p eq 'Microsoft Copilot (Microsoft 365)') and generalAvailabilityDate eq '2025-10'"
}
```

```json
{
  "filter": "status eq 'Launched' and releaseRings/any(r:r eq 'General Availability')"
}
```

## 🔍 OData Filter Syntax

Die API unterstützt OData v2 Filter:

### Array Filters (für products, platforms, releaseRings)
```
products/any(p:p eq 'Microsoft Teams')
platforms/any(p:p eq 'Web')
releaseRings/any(r:r eq 'General Availability')
```

### Vergleichsoperatoren
```
status eq 'Launched'
generalAvailabilityDate eq '2025-10'
generalAvailabilityDate ge '2025-10'  (greater or equal)
generalAvailabilityDate le '2025-12'  (less or equal)
```

### Logische Operatoren
```
status eq 'Launched' and generalAvailabilityDate eq '2025-10'
status eq 'Rolling out' or status eq 'Launched'
```

### Beispiel-Queries

**Copilot Items für Oktober 2025:**
```
products/any(p:p eq 'Microsoft Copilot (Microsoft 365)') and generalAvailabilityDate eq '2025-10'
```

**Teams Items in Public Preview:**
```
products/any(p:p eq 'Microsoft Teams') and releaseRings/any(r:r eq 'Public Preview')
```

**Alle Items ab Oktober 2025:**
```
generalAvailabilityDate ge '2025-10'
```

## 🛠️ Installation & Lokale Entwicklung

### Voraussetzungen
- Node.js 18.x oder höher
- npm oder yarn

### Setup
```bash
# Repository klonen
git clone <repository-url>
cd "Roadmap MCP"

# Dependencies installieren
npm install

# Projekt bauen
npm run build

# Server starten
npm start
```

Der Server läuft dann auf `http://localhost:3000/mcp`

### Entwicklungsmodus
```bash
npm run dev
```

## 🌐 Deployment

### Azure Web App

1. **Azure Web App erstellen:**
```bash
az webapp create \
  --name m365-roadmap-mcp \
  --resource-group <your-resource-group> \
  --plan <your-app-service-plan> \
  --runtime "NODE|20-lts"
```

2. **GitHub Secrets einrichten:**
   - Gehe zu Repository Settings > Secrets
   - Füge `AZURE_WEBAPP_PUBLISH_PROFILE` hinzu
   - Hole das Publish Profile aus dem Azure Portal

3. **Automatisches Deployment:**
   - Push zu `main` Branch triggert automatisches Deployment via GitHub Actions

### Docker

```bash
# Build Docker Image
docker build -t m365-roadmap-mcp .

# Run Container
docker run -p 3000:3000 m365-roadmap-mcp
```

### Azure Container Instances

```bash
# Build und Push zu Container Registry
docker build -t <registry-name>.azurecr.io/m365-roadmap-mcp:latest .
docker push <registry-name>.azurecr.io/m365-roadmap-mcp:latest

# Deploy zu Azure Container Instances
az container create \
  --resource-group <resource-group> \
  --name m365-roadmap-mcp \
  --image <registry-name>.azurecr.io/m365-roadmap-mcp:latest \
  --dns-name-label m365-roadmap-mcp \
  --ports 3000
```

## 🔌 Copilot Studio Integration

### 1. MCP Server URL
Nach dem Deployment notiere die URL:
- Azure Web App: `https://m365-roadmap-mcp.azurewebsites.net/mcp`
- Azure Container: `https://<dns-name>.region.azurecontainer.io:3000/mcp`

### 2. In Copilot Studio konfigurieren

1. Öffne Copilot Studio
2. Gehe zu **Settings** > **MCP Servers**
3. Klicke auf **Add Server**
4. Konfiguriere:
   - **Name**: Microsoft 365 Roadmap
   - **Type**: HTTP
   - **URL**: `<your-deployment-url>/mcp`
5. Speichern

### 3. Tools verwenden

Die 8 Tools sind jetzt in Copilot Studio verfügbar:
- `get_roadmap_items` - Alle Items mit optionalen Filtern
- `search_roadmap` - Keyword-Suche
- `get_roadmap_item` - Einzelnes Item nach ID
- `filter_by_product` - Nach Produkt filtern (z.B. Copilot, Teams, SharePoint)
- `filter_by_release_phase` - Nach Release Ring filtern
- `filter_by_status` - Nach Status filtern
- `filter_by_date` - Nach Datum filtern
- `filter_roadmap` - Erweiterte OData Queries

### 4. Beispiel-Anfragen

**Alle Copilot Items für Oktober 2025:**
```
Tool: filter_roadmap
Filter: products/any(p:p eq 'Microsoft Copilot (Microsoft 365)') and generalAvailabilityDate eq '2025-10'
```

**Teams Items im Rollout:**
```
Tool: filter_by_product
Product: Microsoft Teams
+ filter_by_status
Status: Rolling out
```

## 🧪 Testing

### Lokales Testen mit MCP Inspector

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

### Health Check
```bash
curl http://localhost:3000/health
```

### Tool Aufruf Beispiele

**Get all roadmap items:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_roadmap_items",
      "arguments": {
        "limit": 10
      }
    },
    "id": 1
  }'
```

**Search roadmap:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "search_roadmap",
      "arguments": {
        "keyword": "Teams",
        "limit": 5
      }
    },
    "id": 1
  }'
```

**Filter Copilot items for October 2025:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "filter_roadmap",
      "arguments": {
        "filter": "products/any(p:p eq '\''Microsoft Copilot (Microsoft 365)'\'') and generalAvailabilityDate eq '\''2025-10'\''",
        "limit": 50
      }
    },
    "id": 1
  }'
```

**Get specific roadmap item:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_roadmap_item",
      "arguments": {
        "id": "497417"
      }
    },
    "id": 1
  }'
```

## 📚 API Referenz

### Microsoft 365 Roadmap API
- **Endpoint v2**: `https://www.microsoft.com/releasecommunications/api/v2/m365`
- **Protocol**: OData v2 with array filters
- **Dokumentation**: [Microsoft 365 Roadmap](https://www.microsoft.com/microsoft-365/roadmap)

**Verfügbare Filter Felder:**
- `id` (number): Roadmap Item ID
- `title` (string): Titel des Items
- `description` (string): Beschreibung
- `status` (string): "In development", "Rolling out", "Launched"
- `products` (array): Liste der betroffenen Produkte
- `platforms` (array): Liste der Plattformen (Web, Desktop, Mobile, etc.)
- `releaseRings` (array): "General Availability", "Public Preview", etc.
- `cloudInstances` (array): Cloud-Instanzen
- `generalAvailabilityDate` (string): GA Datum im Format YYYY-MM
- `previewAvailabilityDate` (string): Preview Datum im Format YYYY-MM
- `created` (datetime): Erstellungsdatum
- `modified` (datetime): Änderungsdatum

### MCP Protocol
- **Spezifikation**: [Model Context Protocol](https://modelcontextprotocol.io/)
- **Version**: 2025-06-18

## 🔧 Konfiguration

### Umgebungsvariablen

```bash
PORT=3000              # Server Port (Standard: 3000)
NODE_ENV=production    # Node Umgebung
```

## 📁 Projektstruktur

```
.
├── src/
│   └── index.ts          # MCP Server Implementation
├── build/                # Kompilierte TypeScript Dateien
├── .github/
│   └── workflows/
│       ├── azure-deploy.yml  # Azure Deployment
│       └── build.yml         # Build & Test
├── .azure/
│   └── config.yml        # Azure Konfiguration
├── Dockerfile            # Docker Container Setup
├── package.json          # Node.js Dependencies
├── tsconfig.json         # TypeScript Konfiguration
└── README.md            # Diese Datei
```

## 🤝 Beitragen

Contributions sind willkommen! Bitte:
1. Fork das Repository
2. Erstelle einen Feature Branch
3. Committe deine Änderungen
4. Push zum Branch
5. Erstelle einen Pull Request

## 📝 Lizenz

MIT License - siehe LICENSE Datei für Details

## 🆘 Support

Bei Fragen oder Problemen:
- Erstelle ein [GitHub Issue](../../issues)
- Konsultiere die [MCP Dokumentation](https://modelcontextprotocol.io/)
- Besuche die [Microsoft 365 Roadmap](https://www.microsoft.com/microsoft-365/roadmap)

## 🔗 Links

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Microsoft 365 Roadmap](https://www.microsoft.com/microsoft-365/roadmap)
- [Copilot Studio](https://www.microsoft.com/microsoft-copilot/microsoft-copilot-studio)
- [Azure Web Apps](https://azure.microsoft.com/services/app-service/web/)
