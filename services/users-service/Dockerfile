FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3002
# Verify build output
RUN ls -la dist
CMD ["node", "dist/src/server.js"]
