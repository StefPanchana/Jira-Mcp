FROM node:18-alpine

WORKDIR /app

# Copiar package.json primero
COPY package*.json ./
RUN npm install

# Copiar todos los archivos
COPY . .

# Verificar que el archivo existe
RUN ls -la

CMD ["node", "jira-mcp-server.js"]
