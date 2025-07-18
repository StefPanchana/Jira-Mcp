# Jira MCP Service - Configuración Multi-Cliente

## Despliegue del Servicio

### 1. Iniciar el servicio compartido:
```bash
docker-compose up -d
```

### 2. Configuración por cliente:

Cada cliente configura su propio archivo MCP con sus credenciales:

```json
{
  "mcpServers": {
    "jira-personal": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "--network", "jira-mcp_jira-mcp-network",
        "-e", "ATLASSIAN_INSTANCE_URL=https://TU-INSTANCIA.atlassian.net",
        "-e", "ATLASSIAN_EMAIL=TU-EMAIL@empresa.com", 
        "-e", "ATLASSIAN_API_TOKEN=TU-TOKEN-PERSONAL",
        "jira-mcp-server"
      ]
    }
  }
}
```

### 3. Variables por cliente:
- `ATLASSIAN_INSTANCE_URL`: URL de tu instancia Jira
- `ATLASSIAN_EMAIL`: Tu email personal
- `ATLASSIAN_API_TOKEN`: Tu token personal de API

## Ventajas:
- ✅ Servicio centralizado
- ✅ Configuración individual por cliente
- ✅ Escalabilidad horizontal
- ✅ Aislamiento de credenciales
- ✅ Fácil mantenimiento del código base

## Uso:
Cada cliente solo necesita configurar sus credenciales personales. El servicio maneja múltiples clientes de forma independiente.