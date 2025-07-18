FROM node:18-alpine

WORKDIR /app

# Copiar package.json primero para aprovechar cache de Docker
COPY package*.json ./
RUN npm ci --only=production

# Copiar código fuente
COPY jira-mcp-server.js ./
COPY mcp.json ./

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S jira -u 1001

USER jira

EXPOSE 3000

CMD ["node", "jira-mcp-server.js"]
