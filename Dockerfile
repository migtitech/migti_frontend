# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# API base URL is baked in at build time (e.g. http://localhost:4545/api for local)
ARG VITE_API_BASE_URL=http://localhost:4545/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Production stage: serve static files with nginx
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html

# SPA: serve index.html for client-side routes
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
