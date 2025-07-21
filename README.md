# Jira MCP Server v1.0.0

**Servidor MCP optimizado para integración con Jira/Atlassian - Listo para Producción**

## 🚀 Características

- ✅ **10 herramientas core** optimizadas
- ✅ **Soporte multi-cliente** con configuración individual
- ✅ **Gestión completa de jerarquías** (Epic → Story → Task → Subtask)
- ✅ **Validaciones automáticas** antes de crear issues
- ✅ **Formato de texto estable** compatible con Jira
- ✅ **Manejo robusto de errores** con retry automático
- ✅ **Despliegue Docker** listo para producción

## 🛠️ Herramientas Disponibles

### **Core Tools**
- `get_jira_projects` - Listar proyectos
- `search_jira_issues` - Búsqueda universal con JQL
- `create_jira_issue` - Crear cualquier tipo de issue (Task, Historia, Epic)
- `update_jira_issue` - Actualizar issues existentes

### **Hierarchy Tools**
- `link_jira_issues` - Vincular issues (parent-child, relates to)
- `create_subtask_with_parent` - Crear subtareas vinculadas
- `create_epic_with_stories` - Crear épica con historias automáticamente

### **Utility Tools**
- `validate_issue_creation` - Validar tipos de issue antes de crear
- `get_project_details` - Obtener detalles completos de proyecto
- `delete_jira_issue` - Eliminar o cancelar issues

## ⚙️ Configuración

### **Variables de Entorno**
```bash
# Requeridas
ATLASSIAN_INSTANCE_URL=https://tu-instancia.atlassian.net
ATLASSIAN_EMAIL=tu-email@empresa.com
ATLASSIAN_API_TOKEN=tu-token-api

# Opcional - Modo de operación
MCP_MODE=service  # Para multi-cliente, omitir para cliente único
```

### **Obtener Token de API**
1. Ve a [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Crea un nuevo token de API
3. Copia el token generado

## 🐳 Despliegue Docker

### **Construcción**
```bash
docker build -t jira-mcp-server .
```

### **Ejecución - Cliente Único**
```bash
docker run -e ATLASSIAN_INSTANCE_URL=https://tu-instancia.atlassian.net \
           -e ATLASSIAN_EMAIL=tu-email@empresa.com \
           -e ATLASSIAN_API_TOKEN=tu-token \
           jira-mcp-server
```

### **Ejecución - Multi-Cliente**
```bash
docker-compose up -d
```

## 🔧 Configuración Amazon Q Developer

### **Cliente Único**
```json
{
  "mcpServers": {
    "jira-personal": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "ATLASSIAN_INSTANCE_URL=https://tu-instancia.atlassian.net",
        "-e", "ATLASSIAN_EMAIL=tu-email@empresa.com",
        "-e", "ATLASSIAN_API_TOKEN=tu-token",
        "jira-mcp-server"
      ]
    }
  }
}
```

### **Multi-Cliente (Servicio)**
```json
{
  "mcpServers": {
    "jira-service": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "--network", "jira-mcp_jira-mcp-network",
        "-e", "MCP_MODE=service",
        "jira-mcp-server"
      ]
    }
  }
}
```

## 📋 Ejemplos de Uso

### **Crear Historia de Usuario**
```javascript
create_jira_issue({
  project_key: "MYPROJ",
  summary: "Como usuario quiero login",
  description: "Implementar sistema de autenticación",
  issue_type: "Historia",
  acceptance_criteria: "- Login con email\n- Validación de contraseña\n- Recordar sesión"
})
```

### **Crear Épica con Historias**
```javascript
create_epic_with_stories({
  project_key: "MYPROJ",
  epic_summary: "Sistema de Autenticación",
  epic_description: "Implementar autenticación completa",
  stories: [
    {
      summary: "Login de usuario",
      description: "Pantalla de login",
      acceptance_criteria: "- Validar credenciales\n- Mostrar errores"
    },
    {
      summary: "Registro de usuario",
      description: "Pantalla de registro"
    }
  ]
})
```

### **Buscar Issues con JQL**
```javascript
search_jira_issues({
  jql: "project = MYPROJ AND assignee = currentUser() AND status = 'In Progress'",
  max_results: 20
})
```

### **Crear Subtarea**
```javascript
create_subtask_with_parent({
  project_key: "MYPROJ",
  parent_key: "MYPROJ-123",
  summary: "Implementar validación de email",
  description: "Validar formato de email en frontend"
})
```

## 🔍 Validaciones

### **Validar Tipo de Issue**
```javascript
validate_issue_creation({
  project_key: "MYPROJ",
  issue_type: "Historia"
})
// Respuesta: ✅ Historia: Válido
// Tipos disponibles: Task, Historia, Epic, Sub-task
```

## 📊 Arquitectura

```
Amazon Q Developer
       ↓
   MCP Protocol
       ↓
Jira MCP Server (Docker)
       ↓
   Jira REST API v3
       ↓
  Atlassian Cloud
```

## 🚦 Estados de Respuesta

- ✅ **Éxito**: Operación completada
- ❌ **Error**: Fallo en la operación
- ⚠️ **Advertencia**: Operación parcial
- 🔍 **Información**: Datos de consulta
- 📋 **Lista**: Múltiples resultados

## 🔧 Desarrollo

### **Instalación Local**
```bash
npm install
npm start
```

### **Estructura del Proyecto**
```
jira-mcp/
├── jira-mcp-server.js     # Servidor principal optimizado
├── package.json           # Dependencias y scripts
├── mcp.json              # Configuración MCP
├── dockerfile            # Imagen Docker
├── docker-compose.yml    # Servicio multi-cliente
├── .dockerignore         # Exclusiones Docker
└── README.md            # Documentación
```

## 📝 Changelog

### **v1.0.0 - Versión Optimizada**
- ✅ Consolidadas 25 → 10 herramientas core
- ✅ Eliminadas funcionalidades duplicadas
- ✅ Formato de texto estable para Jira
- ✅ Soporte multi-cliente mejorado
- ✅ Validaciones automáticas
- ✅ Manejo robusto de errores
- ✅ Documentación completa

## 🤝 Contribución

1. Fork del repositorio
2. Crear branch de feature
3. Commit de cambios
4. Push al branch
5. Crear Pull Request

## 📄 Licencia

MIT License - Ver archivo LICENSE para detalles

## 🆘 Soporte

- **Issues**: Reportar bugs o solicitar features
- **Documentación**: Ver ejemplos en este README
- **Jira API**: [Documentación oficial](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)

---

**Desarrollado para Amazon Q Developer** | **Optimizado para Producción** | **v1.0.0**
