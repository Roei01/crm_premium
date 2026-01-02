#!/bin/bash
echo "MONGODB_URI=mongodb+srv://roeinagar011_db_user:40BIHMZ5XzTtK2BD@crm-cluster.vvuj62o.mongodb.net/crm_db?retryWrites=true&w=majority" > .env
echo "JWT_SECRET=super-secret-key-change-in-prod-123456" >> .env
echo "ACCESS_TOKEN_TTL_MINUTES=15" >> .env
echo "REFRESH_TOKEN_TTL_DAYS=7" >> .env
echo "PORT_AUTH=3001" >> .env
echo "PORT_USERS=3002" >> .env
echo "PORT_GATEWAY=3000" >> .env
echo "Created .env file successfully."

