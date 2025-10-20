# 🚀 Azure Deployment - Nächste Schritte

## ✅ Was bereits erledigt ist:

1. ✅ Azure Resource Group erstellt: `rg-roadmap-mcp`
2. ✅ App Service Plan erstellt: `plan-roadmap-mcp` (Basic B1)
3. ✅ Web App erstellt: `roadmap-mcp-server`
4. ✅ Always On aktiviert
5. ✅ Node.js 20 LTS konfiguriert
6. ✅ Startup Command gesetzt: `npm start`
7. ✅ Git Repository initialisiert
8. ✅ Initial Commit erstellt
9. ✅ GitHub Actions Workflow konfiguriert

## 🔧 Was du jetzt machen musst:

### Schritt 1: GitHub Repository erstellen

1. Gehe zu: https://github.com/new
2. Erstelle ein neues Repository:
   - **Name**: `roadmap-mcp-server` (oder einen anderen Namen)
   - **Visibility**: Public oder Private
   - ❌ **NICHT** "Initialize with README" ankreuzen
3. Klicke auf "Create repository"

### Schritt 2: Repository mit lokalem Code verknüpfen

Führe diese Befehle im Terminal aus (ersetze `<your-github-username>` mit deinem GitHub Username):

```bash
cd "/Users/olivermenzel/DevOPS/Roadmap MCP"

# Remote hinzufügen
git remote add origin https://github.com/<your-github-username>/roadmap-mcp-server.git

# Push to GitHub
git push -u origin main
```

### Schritt 3: Azure Publish Profile als GitHub Secret hinzufügen

1. Öffne dein GitHub Repository
2. Gehe zu **Settings** → **Secrets and variables** → **Actions**
3. Klicke auf **New repository secret**
4. Konfiguriere das Secret:
   - **Name**: `AZURE_WEBAPP_PUBLISH_PROFILE`
   - **Value**: Kopiere den Inhalt der Datei `/tmp/azure-publish-profile.xml`

**Um den Inhalt zu kopieren:**
```bash
cat /tmp/azure-publish-profile.xml
```

5. Klicke auf **Add secret**

### Schritt 4: Deployment testen

Nachdem du das Secret hinzugefügt hast:

1. Die GitHub Action wird automatisch ausgeführt
2. Oder mache einen kleinen Change und push erneut:
   ```bash
   cd "/Users/olivermenzel/DevOPS/Roadmap MCP"
   echo "# Deployment Test" >> README.md
   git add README.md
   git commit -m "Test deployment"
   git push
   ```

3. Beobachte den Deployment-Prozess unter:
   - **Actions** Tab in deinem GitHub Repository

### Schritt 5: Testen des deployed Servers

Nach erfolgreichem Deployment (ca. 2-3 Minuten):

```bash
# Health Check
curl https://roadmap-mcp-server.azurewebsites.net/health

# MCP Tools Liste
curl -X POST https://roadmap-mcp-server.azurewebsites.net/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'

# Test Copilot Filter
curl -X POST https://roadmap-mcp-server.azurewebsites.net/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "filter_by_product",
      "arguments": {
        "product": "Microsoft Copilot (Microsoft 365)",
        "limit": 5
      }
    },
    "id": 1
  }'
```

## 🎯 Copilot Studio Integration

Nach erfolgreichem Deployment:

1. **Öffne Copilot Studio**
2. Gehe zu **Settings** → **Generative AI**
3. Klicke auf **Add MCP Server**
4. Konfiguriere:
   - **Name**: Microsoft 365 Roadmap
   - **Type**: HTTP
   - **URL**: `https://roadmap-mcp-server.azurewebsites.net/mcp`
   - **Authentication**: None
5. Speichern und Tools testen!

## 📊 Azure Ressourcen

**Resource Group**: `rg-roadmap-mcp`
**Web App**: `roadmap-mcp-server`
**URL**: https://roadmap-mcp-server.azurewebsites.net
**MCP Endpoint**: https://roadmap-mcp-server.azurewebsites.net/mcp
**Region**: West Europe
**SKU**: Basic B1 (~€13/Monat)
**Always On**: ✅ Aktiviert

## 🔄 Zukünftige Updates

Jedes Mal wenn du Code änderst und zu GitHub pushst:

```bash
cd "/Users/olivermenzel/DevOPS/Roadmap MCP"
# Änderungen machen...
git add .
git commit -m "Deine Änderung"
git push
```

→ GitHub Actions deployed automatisch zu Azure! 🚀

## 📝 Nützliche Befehle

```bash
# Azure Logs anzeigen
az webapp log tail --name roadmap-mcp-server --resource-group rg-roadmap-mcp

# App neu starten
az webapp restart --name roadmap-mcp-server --resource-group rg-roadmap-mcp

# Deployment Status prüfen
az webapp deployment list --name roadmap-mcp-server --resource-group rg-roadmap-mcp

# App Settings anzeigen
az webapp config appsettings list --name roadmap-mcp-server --resource-group rg-roadmap-mcp
```

## 🆘 Troubleshooting

Falls der Server nicht startet:

1. **Logs prüfen:**
   ```bash
   az webapp log tail --name roadmap-mcp-server --resource-group rg-roadmap-mcp
   ```

2. **Im Azure Portal prüfen:**
   - https://portal.azure.com
   - Suche nach "roadmap-mcp-server"
   - Unter "Deployment Center" → "Logs"

3. **Startup Command prüfen:**
   ```bash
   az webapp config show --name roadmap-mcp-server --resource-group rg-roadmap-mcp --query "appCommandLine"
   ```

## 💰 Kosten

**Basic B1 Plan**: ~€13/Monat
- 1.75 GB RAM
- 1 vCPU
- 10 GB Storage
- Always On inklusive
- Keine Cold Starts

**Free Trial**: Erste 30 Tage kostenlos für neue Azure Accounts!

## 🗑️ Ressourcen löschen (falls nötig)

Um alle Ressourcen zu entfernen:

```bash
az group delete --name rg-roadmap-mcp --yes --no-wait
```

⚠️ **Achtung**: Dies löscht die gesamte Resource Group mit allen Ressourcen!
