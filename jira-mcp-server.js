#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Configuración de Jira
let JIRA_URL = process.env.ATLASSIAN_INSTANCE_URL;
let EMAIL = process.env.ATLASSIAN_EMAIL;
let API_TOKEN = process.env.ATLASSIAN_API_TOKEN;
const SERVICE_MODE = process.env.MCP_MODE === 'service';

class JiraMCPServer {
  constructor() {
    this.server = new Server(
      { name: 'jira-mcp-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    this.setupToolHandlers();
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // CORE TOOLS
        {
          name: 'get_jira_projects',
          description: 'Obtener lista de proyectos de Jira',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'search_jira_issues',
          description: 'Buscar issues con JQL (incluye historias de usuario)',
          inputSchema: {
            type: 'object',
            properties: {
              jql: { type: 'string', description: 'Query JQL' },
              max_results: { type: 'number', default: 50 }
            },
            required: ['jql']
          }
        },
        {
          name: 'create_jira_issue',
          description: 'Crear issue (Task, Historia, Epic, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              project_key: { type: 'string' },
              summary: { type: 'string' },
              description: { type: 'string' },
              issue_type: { type: 'string', default: 'Tarea' },
              acceptance_criteria: { type: 'string' }
            },
            required: ['project_key', 'summary']
          }
        },
        {
          name: 'update_jira_issue',
          description: 'Actualizar issue existente',
          inputSchema: {
            type: 'object',
            properties: {
              issue_key: { type: 'string' },
              summary: { type: 'string' },
              description: { type: 'string' },
              status: { type: 'string' }
            },
            required: ['issue_key']
          }
        },
        // HIERARCHY TOOLS
        {
          name: 'link_jira_issues',
          description: 'Vincular issues (parent-child, relates to, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              parent_key: { type: 'string' },
              child_key: { type: 'string' },
              link_type: { type: 'string', default: 'Relates' }
            },
            required: ['parent_key', 'child_key']
          }
        },
        {
          name: 'create_subtask_with_parent',
          description: 'Crear subtarea vinculada a issue padre',
          inputSchema: {
            type: 'object',
            properties: {
              project_key: { type: 'string' },
              parent_key: { type: 'string' },
              summary: { type: 'string' },
              description: { type: 'string' }
            },
            required: ['project_key', 'parent_key', 'summary']
          }
        },
        {
          name: 'create_epic_with_stories',
          description: 'Crear épica con historias vinculadas',
          inputSchema: {
            type: 'object',
            properties: {
              project_key: { type: 'string' },
              epic_summary: { type: 'string' },
              epic_description: { type: 'string' },
              stories: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    summary: { type: 'string' },
                    description: { type: 'string' },
                    acceptance_criteria: { type: 'string' }
                  }
                }
              }
            },
            required: ['project_key', 'epic_summary', 'stories']
          }
        },
        // UTILITY TOOLS
        {
          name: 'validate_issue_creation',
          description: 'Validar tipos de issue antes de crear',
          inputSchema: {
            type: 'object',
            properties: {
              project_key: { type: 'string' },
              issue_type: { type: 'string' }
            },
            required: ['project_key', 'issue_type']
          }
        },
        {
          name: 'get_project_details',
          description: 'Obtener detalles completos de un proyecto',
          inputSchema: {
            type: 'object',
            properties: { project_key: { type: 'string' } },
            required: ['project_key']
          }
        },
        {
          name: 'delete_jira_issue',
          description: 'Eliminar issue o cambiar a Cancelado',
          inputSchema: {
            type: 'object',
            properties: {
              issue_key: { type: 'string' },
              force_delete: { type: 'boolean', default: false }
            },
            required: ['issue_key']
          }
        },

      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const clientConfig = this.extractClientConfig(request.params.arguments);
      
      switch (request.params.name) {
        case 'get_jira_projects': return this.getProjects();
        case 'search_jira_issues': return this.searchIssues(request.params.arguments);
        case 'create_jira_issue': return this.createIssue(request.params.arguments);
        case 'update_jira_issue': return this.updateIssue(request.params.arguments);
        case 'link_jira_issues': return this.linkJiraIssues(request.params.arguments);
        case 'create_subtask_with_parent': return this.createSubtaskWithParent(request.params.arguments);
        case 'create_epic_with_stories': return this.createEpicWithStories(request.params.arguments);
        case 'validate_issue_creation': return this.validateIssueCreation(request.params.arguments);
        case 'get_project_details': return this.getProjectDetails(request.params.arguments);
        case 'delete_jira_issue': return this.deleteIssue(request.params.arguments);

        default: throw new Error(`Herramienta desconocida: ${request.params.name}`);
      }
    });
  }

  async makeJiraRequest(endpoint, method = 'GET', body = null, retries = 3, clientConfig = null) {
    const jiraUrl = clientConfig?.jiraUrl || JIRA_URL;
    const email = clientConfig?.email || EMAIL;
    const apiToken = clientConfig?.apiToken || API_TOKEN;
    
    const url = `${jiraUrl}/rest/api/3${endpoint}`;
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
    
    const options = {
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    };

    if (body) options.body = JSON.stringify(body);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          throw new Error(`HTTP ${response.status}: ${errorData.message || errorData.errorMessages?.join(', ') || response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        if (attempt === retries) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  formatTextForJira(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')  // Eliminar **bold**
      .replace(/\*(.*?)\*/g, '$1')     // Eliminar *italic*
      .replace(/^- /gm, '• ')          // Convertir - a bullet
      .replace(/^# (.*)/gm, '$1')     // Eliminar # headers
      .replace(/^## (.*)/gm, '$1')    // Eliminar ## headers
      .replace(/`(.*?)`/g, '$1')      // Eliminar `code`
      .trim();
  }

  createSimpleADF(text) {
    if (!text) return { type: 'doc', version: 1, content: [] };
    
    const cleanText = this.formatTextForJira(text);
    return {
      type: 'doc',
      version: 1,
      content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: cleanText }]
      }]
    };
  }

  async getProjectIssueTypes(projectKey) {
    try {
      const project = await this.makeJiraRequest(`/project/${projectKey}`);
      return project.issueTypes || [];
    } catch (error) {
      return [];
    }
  }

  // CORE METHODS
  async getProjects() {
    try {
      const projects = await this.makeJiraRequest('/project');
      const simplified = projects.map(p => ({
        key: p.key,
        name: p.name,
        projectType: p.projectTypeKey,
        lead: p.lead?.displayName
      }));
      return { content: [{ type: 'text', text: JSON.stringify(simplified, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }
  }

  async searchIssues(args) {
    try {
      const { jql, max_results = 50 } = args;
      const issues = await this.makeJiraRequest(
        `/search?jql=${encodeURIComponent(jql)}&maxResults=${max_results}&fields=summary,status,assignee,issuetype,created,updated`
      );
      
      const simplified = issues.issues?.map(issue => ({
        key: issue.key,
        summary: issue.fields.summary,
        type: issue.fields.issuetype.name,
        status: issue.fields.status.name,
        assignee: issue.fields.assignee?.displayName || 'Sin asignar',
        created: issue.fields.created?.split('T')[0],
        link: `${JIRA_URL}/browse/${issue.key}`
      }));
      
      return { content: [{ type: 'text', text: JSON.stringify(simplified, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }
  }

  async createIssue(args) {
    try {
      const { project_key, summary, description = '', issue_type = 'Tarea', acceptance_criteria = '' } = args;
      
      let fullDescription = this.formatTextForJira(description);
      if (acceptance_criteria && issue_type === 'Historia') {
        fullDescription += `\n\nCRITERIOS DE ACEPTACION:\n${this.formatTextForJira(acceptance_criteria)}`;
      }

      const issueData = {
        fields: {
          project: { key: project_key },
          summary: this.formatTextForJira(summary),
          description: this.createSimpleADF(fullDescription),
          issuetype: { name: issue_type }
        }
      };

      const result = await this.makeJiraRequest('/issue', 'POST', issueData);
      return {
        content: [{ type: 'text', text: `✅ ${issue_type} creado: ${result.key}\n🔗 ${JIRA_URL}/browse/${result.key}` }]
      };
    } catch (error) {
      return { content: [{ type: 'text', text: `❌ Error: ${error.message}` }], isError: true };
    }
  }

  async updateIssue(args) {
    try {
      const { issue_key, summary, description, status } = args;
      const updateData = { fields: {} };
      
      if (summary) updateData.fields.summary = this.formatTextForJira(summary);
      if (description) updateData.fields.description = this.createSimpleADF(description);
      if (status) updateData.fields.status = { name: status };

      await this.makeJiraRequest(`/issue/${issue_key}`, 'PUT', updateData);
      return { content: [{ type: 'text', text: `✅ Issue ${issue_key} actualizado` }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `❌ Error: ${error.message}` }], isError: true };
    }
  }

  // HIERARCHY METHODS
  async linkJiraIssues(args) {
    try {
      const { parent_key, child_key, link_type = 'Relates' } = args;
      
      // Validar que ambos issues existen
      await this.makeJiraRequest(`/issue/${parent_key}`);
      await this.makeJiraRequest(`/issue/${child_key}`);
      
      const linkData = {
        type: { name: link_type },
        inwardIssue: { key: child_key },
        outwardIssue: { key: parent_key }
      };

      await this.makeJiraRequest('/issueLink', 'POST', linkData);
      return { content: [{ type: 'text', text: `✅ Issues vinculados: ${parent_key} -> ${child_key} (${link_type})` }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `❌ Error vinculando issues: ${error.message}` }], isError: true };
    }
  }

  async createSubtaskWithParent(args) {
    try {
      const { project_key, parent_key, summary, description = '' } = args;
      
      await this.makeJiraRequest(`/issue/${parent_key}`); // Validar parent existe
      
      const subtaskData = {
        fields: {
          project: { key: project_key },
          parent: { key: parent_key },
          summary: this.formatTextForJira(summary),
          description: this.createSimpleADF(description),
          issuetype: { name: 'Subtarea' }
        }
      };

      const result = await this.makeJiraRequest('/issue', 'POST', subtaskData);
      return { content: [{ type: 'text', text: `✅ Subtarea creada: ${result.key} bajo ${parent_key}` }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `❌ Error: ${error.message}` }], isError: true };
    }
  }

  async createEpicWithStories(args) {
    try {
      const { project_key, epic_summary, epic_description = '', stories } = args;
      
      // Crear épica
      const epicData = {
        fields: {
          project: { key: project_key },
          summary: this.formatTextForJira(epic_summary),
          description: this.createSimpleADF(epic_description),
          issuetype: { name: 'Epic' }
        }
      };
      
      const epic = await this.makeJiraRequest('/issue', 'POST', epicData);
      const createdStories = [];
      
      // Crear historias vinculadas
      for (const story of stories) {
        let storyDesc = this.formatTextForJira(story.description || '');
        if (story.acceptance_criteria) {
          storyDesc += `\n\nCRITERIOS DE ACEPTACION:\n${this.formatTextForJira(story.acceptance_criteria)}`;
        }

        const storyData = {
          fields: {
            project: { key: project_key },
            summary: this.formatTextForJira(story.summary),
            description: this.createSimpleADF(storyDesc),
            issuetype: { name: 'Historia' },
            customfield_10014: epic.key // Epic Link
          }
        };
        
        const storyResult = await this.makeJiraRequest('/issue', 'POST', storyData);
        createdStories.push(storyResult.key);
      }
      
      return {
        content: [{ type: 'text', text: `✅ Épica creada: ${epic.key}\n📋 Historias: ${createdStories.join(', ')}` }]
      };
    } catch (error) {
      return { content: [{ type: 'text', text: `❌ Error: ${error.message}` }], isError: true };
    }
  }



  // UTILITY METHODS
  async validateIssueCreation(args) {
    try {
      const { project_key, issue_type } = args;
      const project = await this.makeJiraRequest(`/project/${project_key}`);
      const availableTypes = project.issueTypes.map(t => t.name);
      const isValid = availableTypes.includes(issue_type);
      
      return {
        content: [{ 
          type: 'text', 
          text: `${isValid ? '✅' : '❌'} ${issue_type}: ${isValid ? 'Válido' : 'Inválido'}\nTipos disponibles: ${availableTypes.join(', ')}` 
        }]
      };
    } catch (error) {
      return { content: [{ type: 'text', text: `❌ Error: ${error.message}` }], isError: true };
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
        issueTypes: project.issueTypes?.map(type => type.name),
        components: project.components?.map(comp => comp.name),
        versions: project.versions?.map(ver => ver.name)
      };
      
      return { content: [{ type: 'text', text: JSON.stringify(details, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `❌ Error: ${error.message}` }], isError: true };
    }
  }

  async deleteIssue(args) {
    try {
      const { issue_key, force_delete = false } = args;
      
      if (force_delete) {
        await this.makeJiraRequest(`/issue/${issue_key}`, 'DELETE');
        return { content: [{ type: 'text', text: `✅ Issue ${issue_key} eliminado permanentemente` }] };
      } else {
        const transitions = await this.makeJiraRequest(`/issue/${issue_key}/transitions`);
        const cancelTransition = transitions.transitions.find(t => 
          ['Cancel', 'Cancelar', 'Cancelled', 'Cancelado'].some(status => 
            t.name.toLowerCase().includes(status.toLowerCase())
          )
        );
        
        if (cancelTransition) {
          await this.makeJiraRequest(`/issue/${issue_key}/transitions`, 'POST', {
            transition: { id: cancelTransition.id }
          });
          return { content: [{ type: 'text', text: `✅ Issue ${issue_key} cancelado` }] };
        } else {
          return { content: [{ type: 'text', text: `⚠️ No hay transición 'Cancelado'. Use force_delete=true` }] };
        }
      }
    } catch (error) {
      return { content: [{ type: 'text', text: `❌ Error: ${error.message}` }], isError: true };
    }
  }

  extractClientConfig(args) {
    if (!args) return null;
    const config = {};
    if (args.jira_url) config.jiraUrl = args.jira_url;
    if (args.email) config.email = args.email;
    if (args.api_token) config.apiToken = args.api_token;
    
    delete args.jira_url;
    delete args.email;
    delete args.api_token;
    
    return Object.keys(config).length > 0 ? config : null;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`🚀 Jira MCP Server v1.0.0 - ${SERVICE_MODE ? 'Multi-Cliente' : 'Cliente Único'}`);
  }
}

const server = new JiraMCPServer();
server.run().catch(console.error);