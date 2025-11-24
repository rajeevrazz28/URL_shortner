# ---- Build stage ----
FROM node:20-alpine AS build

WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm install

# Build app
COPY . .
RUN npm run build

# ---- Run stage ----
FROM nginx:alpine

# Remove default config (optional but cleaner)
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output to Nginx html dir
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
