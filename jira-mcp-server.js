#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Configuración de Jira desde variables de entorno
const JIRA_URL = process.env.ATLASSIAN_INSTANCE_URL;
const EMAIL = process.env.ATLASSIAN_EMAIL;
const API_TOKEN = process.env.ATLASSIAN_API_TOKEN;

class JiraMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'jira-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    // Listar herramientas disponibles
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_jira_projects',
          description: 'Obtener lista de proyectos de Jira',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_jira_issues',
          description: 'Obtener issues de un proyecto específico',
          inputSchema: {
            type: 'object',
            properties: {
              project_key: {
                type: 'string',
                description: 'Clave del proyecto (ej: PRY56GCN)',
              },
              max_results: {
                type: 'number',
                description: 'Número máximo de resultados',
                default: 50,
              },
            },
            required: ['project_key'],
          },
        },
        {
          name: 'create_jira_issue',
          description: 'Crear un nuevo issue en Jira',
          inputSchema: {
            type: 'object',
            properties: {
              project_key: {
                type: 'string',
                description: 'Clave del proyecto',
              },
              summary: {
                type: 'string',
                description: 'Resumen del issue',
              },
              description: {
                type: 'string',
                description: 'Descripción del issue',
              },
              issue_type: {
                type: 'string',
                description: 'Tipo de issue',
                default: 'Task',
              },
            },
            required: ['project_key', 'summary'],
          },
        },
        {
          name: 'update_jira_issue',
          description: 'Actualizar un issue existente',
          inputSchema: {
            type: 'object',
            properties: {
              issue_key: {
                type: 'string',
                description: 'Clave del issue (ej: PRY56GCN-123)',
              },
              summary: {
                type: 'string',
                description: 'Nuevo resumen',
              },
              description: {
                type: 'string',
                description: 'Nueva descripción',
              },
              status: {
                type: 'string',
                description: 'Nuevo estado',
              },
            },
            required: ['issue_key'],
          },
        },
        {
          name: 'assign_jira_issue',
          description: 'Asignar un issue a un usuario',
          inputSchema: {
            type: 'object',
            properties: {
              issue_key: {
                type: 'string',
                description: 'Clave del issue',
              },
              assignee: {
                type: 'string',
                description: 'Email o ID del usuario',
              },
            },
            required: ['issue_key', 'assignee'],
          },
        },
        {
          name: 'add_jira_comment',
          description: 'Agregar comentario a un issue',
          inputSchema: {
            type: 'object',
            properties: {
              issue_key: {
                type: 'string',
                description: 'Clave del issue',
              },
              comment: {
                type: 'string',
                description: 'Texto del comentario',
              },
            },
            required: ['issue_key', 'comment'],
          },
        },
        {
          name: 'search_jira_issues',
          description: 'Buscar issues con JQL personalizado',
          inputSchema: {
            type: 'object',
            properties: {
              jql: {
                type: 'string',
                description: 'Query JQL (ej: assignee = currentUser() AND status = "In Progress")',
              },
              max_results: {
                type: 'number',
                description: 'Número máximo de resultados',
                default: 50,
              },
            },
            required: ['jql'],
          },
        },
        {
          name: 'get_jira_sprints',
          description: 'Obtener sprints de un board',
          inputSchema: {
            type: 'object',
            properties: {
              board_id: {
                type: 'number',
                description: 'ID del board',
              },
            },
            required: ['board_id'],
          },
        },
        {
          name: 'get_jira_worklog',
          description: 'Obtener registro de trabajo de un issue',
          inputSchema: {
            type: 'object',
            properties: {
              issue_key: {
                type: 'string',
                description: 'Clave del issue',
              },
            },
            required: ['issue_key'],
          },
        },
        {
          name: 'create_jira_filter',
          description: 'Crear un filtro guardado',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Nombre del filtro',
              },
              jql: {
                type: 'string',
                description: 'Query JQL del filtro',
              },
              description: {
                type: 'string',
                description: 'Descripción del filtro',
              },
            },
            required: ['name', 'jql'],
          },
        },
        {
          name: 'create_user_story',
          description: 'Crear una Historia de Usuario',
          inputSchema: {
            type: 'object',
            properties: {
              project_key: {
                type: 'string',
                description: 'Clave del proyecto',
              },
              summary: {
                type: 'string',
                description: 'Título de la historia',
              },
              description: {
                type: 'string',
                description: 'Descripción detallada',
              },
              acceptance_criteria: {
                type: 'string',
                description: 'Criterios de aceptación',
              },
              story_points: {
                type: 'number',
                description: 'Story points estimados',
              },
              priority: {
                type: 'string',
                description: 'Prioridad (High, Medium, Low)',
                default: 'Medium',
              },
            },
            required: ['project_key', 'summary'],
          },
        },
        {
          name: 'get_user_stories',
          description: 'Obtener Historias de Usuario de un proyecto',
          inputSchema: {
            type: 'object',
            properties: {
              project_key: {
                type: 'string',
                description: 'Clave del proyecto',
              },
              status: {
                type: 'string',
                description: 'Filtrar por estado (opcional)',
              },
              assignee: {
                type: 'string',
                description: 'Filtrar por asignado (opcional)',
              },
              max_results: {
                type: 'number',
                description: 'Número máximo de resultados',
                default: 50,
              },
            },
            required: ['project_key'],
          },
        },
        {
          name: 'update_user_story',
          description: 'Actualizar una Historia de Usuario',
          inputSchema: {
            type: 'object',
            properties: {
              story_key: {
                type: 'string',
                description: 'Clave de la historia (ej: PRY56GCN-123)',
              },
              summary: {
                type: 'string',
                description: 'Nuevo título',
              },
              description: {
                type: 'string',
                description: 'Nueva descripción',
              },
              acceptance_criteria: {
                type: 'string',
                description: 'Nuevos criterios de aceptación',
              },
              story_points: {
                type: 'number',
                description: 'Nuevos story points',
              },
              status: {
                type: 'string',
                description: 'Nuevo estado',
              },
            },
            required: ['story_key'],
          },
        },
        {
          name: 'create_jira_project',
          description: 'Crear un nuevo proyecto en Jira',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'Clave del proyecto (ej: NEWPRJ)',
              },
              name: {
                type: 'string',
                description: 'Nombre del proyecto',
              },
              description: {
                type: 'string',
                description: 'Descripción del proyecto',
              },
              project_type: {
                type: 'string',
                description: 'Tipo de proyecto (software, business)',
                default: 'software',
              },
              template: {
                type: 'string',
                description: 'Template del proyecto (scrum, kanban)',
                default: 'scrum',
              },
              lead: {
                type: 'string',
                description: 'Email del líder del proyecto',
              },
            },
            required: ['key', 'name'],
          },
        },
        {
          name: 'update_jira_project',
          description: 'Actualizar un proyecto existente',
          inputSchema: {
            type: 'object',
            properties: {
              project_key: {
                type: 'string',
                description: 'Clave del proyecto',
              },
              name: {
                type: 'string',
                description: 'Nuevo nombre',
              },
              description: {
                type: 'string',
                description: 'Nueva descripción',
              },
              lead: {
                type: 'string',
                description: 'Nuevo líder del proyecto',
              },
            },
            required: ['project_key'],
          },
        },
        {
          name: 'get_project_details',
          description: 'Obtener detalles de un proyecto',
          inputSchema: {
            type: 'object',
            properties: {
              project_key: {
                type: 'string',
                description: 'Clave del proyecto',
              },
            },
            required: ['project_key'],
          },
        },
        {
          name: 'get_user_permissions',
          description: 'Obtener información del usuario actual y sus permisos',
          inputSchema: {
            type: 'object',
            properties: {
              project_key: {
                type: 'string',
                description: 'Clave del proyecto para verificar permisos específicos (opcional)',
              },
            },
          },
        },
      ],
    }));

    // Manejar llamadas a herramientas
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'get_jira_projects':
          return this.getProjects();
        case 'get_jira_issues':
          return this.getIssues(request.params.arguments);
        case 'create_jira_issue':
          return this.createIssue(request.params.arguments);
        case 'update_jira_issue':
          return this.updateIssue(request.params.arguments);
        case 'assign_jira_issue':
          return this.assignIssue(request.params.arguments);
        case 'add_jira_comment':
          return this.addComment(request.params.arguments);
        case 'search_jira_issues':
          return this.searchIssues(request.params.arguments);
        case 'get_jira_sprints':
          return this.getSprints(request.params.arguments);
        case 'get_jira_worklog':
          return this.getWorklog(request.params.arguments);
        case 'create_jira_filter':
          return this.createFilter(request.params.arguments);
        case 'create_user_story':
          return this.createUserStory(request.params.arguments);
        case 'get_user_stories':
          return this.getUserStories(request.params.arguments);
        case 'update_user_story':
          return this.updateUserStory(request.params.arguments);
        case 'create_jira_project':
          return this.createProject(request.params.arguments);
        case 'update_jira_project':
          return this.updateProject(request.params.arguments);
        case 'get_project_details':
          return this.getProjectDetails(request.params.arguments);
        case 'get_user_permissions':
          return this.getUserPermissions(request.params.arguments);
        default:
          throw new Error(`Herramienta desconocida: ${request.params.name}`);
      }
    });
  }

  async makeJiraRequest(endpoint, method = 'GET', body = null) {
    const url = `${JIRA_URL}/rest/api/3${endpoint}`;
    const auth = Buffer.from(`${EMAIL}:${API_TOKEN}`).toString('base64');
    
    const options = {
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    return response.json();
  }

  async getProjects() {
    try {
      const projects = await this.makeJiraRequest('/project');
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(projects, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async getIssues(args) {
    try {
      const { project_key, max_results = 50 } = args;
      const issues = await this.makeJiraRequest(
        `/search?jql=project=${project_key}&maxResults=${max_results}`
      );
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(issues, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async createIssue(args) {
    try {
      const { project_key, summary, description = '', issue_type = 'Task' } = args;
      const issueData = {
        fields: {
          project: { key: project_key },
          summary,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: description }],
              },
            ],
          },
          issuetype: { name: issue_type },
        },
      };

      const result = await this.makeJiraRequest('/issue', 'POST', issueData);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async updateIssue(args) {
    try {
      const { issue_key, summary, description, status } = args;
      const updateData = { fields: {} };
      
      if (summary) updateData.fields.summary = summary;
      if (description) {
        updateData.fields.description = {
          type: 'doc',
          version: 1,
          content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }]
        };
      }
      if (status) updateData.fields.status = { name: status };

      const result = await this.makeJiraRequest(`/issue/${issue_key}`, 'PUT', updateData);
      return {
        content: [{ type: 'text', text: `Issue ${issue_key} actualizado exitosamente` }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }

  async assignIssue(args) {
    try {
      const { issue_key, assignee } = args;
      const result = await this.makeJiraRequest(`/issue/${issue_key}/assignee`, 'PUT', {
        name: assignee
      });
      return {
        content: [{ type: 'text', text: `Issue ${issue_key} asignado a ${assignee}` }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }

  async addComment(args) {
    try {
      const { issue_key, comment } = args;
      const result = await this.makeJiraRequest(`/issue/${issue_key}/comment`, 'POST', {
        body: {
          type: 'doc',
          version: 1,
          content: [{ type: 'paragraph', content: [{ type: 'text', text: comment }] }]
        }
      });
      return {
        content: [{ type: 'text', text: `Comentario agregado a ${issue_key}` }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }

  async searchIssues(args) {
    try {
      const { jql, max_results = 50 } = args;
      const issues = await this.makeJiraRequest(
        `/search?jql=${encodeURIComponent(jql)}&maxResults=${max_results}`
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(issues, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }

  async getSprints(args) {
    try {
      const { board_id } = args;
      const sprints = await this.makeJiraRequest(`/board/${board_id}/sprint`);
      return {
        content: [{ type: 'text', text: JSON.stringify(sprints, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }

  async getWorklog(args) {
    try {
      const { issue_key } = args;
      const worklog = await this.makeJiraRequest(`/issue/${issue_key}/worklog`);
      return {
        content: [{ type: 'text', text: JSON.stringify(worklog, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }

  async createFilter(args) {
    try {
      const { name, jql, description = '' } = args;
      const filter = await this.makeJiraRequest('/filter', 'POST', {
        name,
        jql,
        description
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(filter, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }

  async createUserStory(args) {
    try {
      const { project_key, summary, description = '', acceptance_criteria = '', story_points, priority = 'Medium' } = args;
      
      let fullDescription = description;
      if (acceptance_criteria) {
        fullDescription += `\n\n*Criterios de Aceptación:*\n${acceptance_criteria}`;
      }

      const storyData = {
        fields: {
          project: { key: project_key },
          summary,
          description: {
            type: 'doc',
            version: 1,
            content: [{ type: 'paragraph', content: [{ type: 'text', text: fullDescription }] }]
          },
          issuetype: { name: 'Story' },
          priority: { name: priority }
        }
      };

      if (story_points) {
        storyData.fields.customfield_10016 = story_points; // Story Points field
      }

      const result = await this.makeJiraRequest('/issue', 'POST', storyData);
      return {
        content: [{ type: 'text', text: `Historia de Usuario creada: ${result.key}` }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }

  async getUserStories(args) {
    try {
      const { project_key, status, assignee, max_results = 50 } = args;
      
      let jql = `project = ${project_key} AND issuetype = Story`;
      if (status) jql += ` AND status = "${status}"`;
      if (assignee) jql += ` AND assignee = "${assignee}"`;
      
      const stories = await this.makeJiraRequest(
        `/search?jql=${encodeURIComponent(jql)}&maxResults=${max_results}`
      );
      
      const simplifiedStories = stories.issues?.map(issue => ({
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status.name,
        assignee: issue.fields.assignee?.displayName || 'Sin asignar',
        storyPoints: issue.fields.customfield_10016 || 'No estimado',
        created: issue.fields.created,
        updated: issue.fields.updated
      }));
      
      return {
        content: [{ type: 'text', text: JSON.stringify(simplifiedStories, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }

  async updateUserStory(args) {
    try {
      const { story_key, summary, description, acceptance_criteria, story_points, status } = args;
      const updateData = { fields: {} };
      
      if (summary) updateData.fields.summary = summary;
      
      if (description || acceptance_criteria) {
        let fullDescription = description || '';
        if (acceptance_criteria) {
          fullDescription += `\n\n*Criterios de Aceptación:*\n${acceptance_criteria}`;
        }
        updateData.fields.description = {
          type: 'doc',
          version: 1,
          content: [{ type: 'paragraph', content: [{ type: 'text', text: fullDescription }] }]
        };
      }
      
      if (story_points) updateData.fields.customfield_10016 = story_points;
      if (status) updateData.fields.status = { name: status };

      await this.makeJiraRequest(`/issue/${story_key}`, 'PUT', updateData);
      return {
        content: [{ type: 'text', text: `Historia de Usuario ${story_key} actualizada exitosamente` }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }

  async createProject(args) {
    try {
      const { key, name, description = '', project_type = 'software', template = 'scrum', lead } = args;
      
      const projectData = {
        key: key.toUpperCase(),
        name,
        description,
        projectTypeKey: project_type,
        projectTemplateKey: `com.pyxis.greenhopper.jira:gh-${template}-template`,
        leadAccountId: lead
      };

      const result = await this.makeJiraRequest('/project', 'POST', projectData);
      return {
        content: [{ type: 'text', text: `Proyecto creado: ${result.key} - ${result.name}` }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }

  async updateProject(args) {
    try {
      const { project_key, name, description, lead } = args;
      const updateData = {};
      
      if (name) updateData.name = name;
      if (description) updateData.description = description;
      if (lead) updateData.leadAccountId = lead;

      await this.makeJiraRequest(`/project/${project_key}`, 'PUT', updateData);
      return {
        content: [{ type: 'text', text: `Proyecto ${project_key} actualizado exitosamente` }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }

  async getProjectDetails(args) {
    try {
      const { project_key } = args;
      const project = await this.makeJiraRequest(`/project/${project_key}`);
      
      const details = {
        key: project.key,
        name: project.name,
        description: project.description,
        lead: project.lead?.displayName,
        projectType: project.projectTypeKey,
        created: project.created,
        issueTypes: project.issueTypes?.map(type => type.name),
        components: project.components?.map(comp => comp.name),
        versions: project.versions?.map(ver => ver.name)
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(details, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }

  async getUserPermissions(args) {
    try {
      const { project_key } = args || {};
      
      // Obtener información del usuario actual
      const currentUser = await this.makeJiraRequest('/myself');
      
      // Obtener permisos globales
      const globalPermissions = await this.makeJiraRequest('/mypermissions');
      
      let projectPermissions = null;
      let projectRole = null;
      
      // Si se especifica un proyecto, obtener permisos específicos
      if (project_key) {
        try {
          projectPermissions = await this.makeJiraRequest(`/mypermissions?projectKey=${project_key}`);
          
          // Obtener rol en el proyecto
          const projectRoles = await this.makeJiraRequest(`/project/${project_key}/role`);
          for (const [roleName, roleUrl] of Object.entries(projectRoles)) {
            const roleDetails = await this.makeJiraRequest(roleUrl.replace(JIRA_URL, ''));
            if (roleDetails.actors?.some(actor => actor.name === currentUser.name || actor.accountId === currentUser.accountId)) {
              projectRole = roleName;
              break;
            }
          }
        } catch (error) {
          // Proyecto no accesible o no existe
        }
      }
      
      const userInfo = {
        user: {
          accountId: currentUser.accountId,
          displayName: currentUser.displayName,
          emailAddress: currentUser.emailAddress,
          accountType: currentUser.accountType,
          active: currentUser.active
        },
        globalPermissions: {
          canCreateProjects: globalPermissions.permissions?.CREATE_PROJECTS?.havePermission || false,
          canAdministerJira: globalPermissions.permissions?.ADMINISTER?.havePermission || false,
          canBrowseUsers: globalPermissions.permissions?.USER_PICKER?.havePermission || false,
          canCreateIssues: globalPermissions.permissions?.CREATE_ISSUES?.havePermission || false
        },
        projectSpecific: project_key ? {
          projectKey: project_key,
          role: projectRole || 'Sin rol asignado',
          permissions: {
            canCreateIssues: projectPermissions?.permissions?.CREATE_ISSUES?.havePermission || false,
            canEditIssues: projectPermissions?.permissions?.EDIT_ISSUES?.havePermission || false,
            canDeleteIssues: projectPermissions?.permissions?.DELETE_ISSUES?.havePermission || false,
            canAssignIssues: projectPermissions?.permissions?.ASSIGN_ISSUES?.havePermission || false,
            canManageProject: projectPermissions?.permissions?.PROJECT_ADMIN?.havePermission || false,
            canViewProject: projectPermissions?.permissions?.BROWSE_PROJECTS?.havePermission || false
          }
        } : null
      };
      
      return {
        content: [{ type: 'text', text: JSON.stringify(userInfo, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Servidor MCP de Jira iniciado');
  }
}

const server = new JiraMCPServer();
server.run().catch(console.error);
