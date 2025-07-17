# Jira MCP Server

MCP Server para integración con Jira/Atlassian.

## Configuración

Variables de entorno requeridas:
- `ATLASSIAN_INSTANCE_URL`: URL de tu instancia Jira
- `ATLASSIAN_EMAIL`: Tu email de Atlassian  
- `ATLASSIAN_API_TOKEN`: Token de API de Atlassian

## Uso

```bash
npm install
node jira-mcp-server.js
```
   - Agregar configuración del servidor

## Uso

```json
{
  "mcpServers": {
    "jira-custom": {
      "command": "node",
      "args": ["ruta/al/jira-mcp-server.js"],
      "env": {
        "ATLASSIAN_API_TOKEN": "tu_token_aqui",
        "ATLASSIAN_EMAIL": "tu_email_aqui",
        "ATLASSIAN_INSTANCE_URL": "https://tu_instancia.atlassian.net"
      }
    }
  }
}
```

## Funcionalidades

- Gestión de proyectos
- Creación y actualización de issues
- Historias de usuario
- Verificación de permisos
- Y más...
