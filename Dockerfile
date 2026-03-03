# migti_frontend - Vite/React build, served as static files (nginx will serve in compose)
FROM node:20-alpine AS builder

WORKDIR /app

# Build-time env for Vite (API URL is set at runtime via nginx proxy, so use relative /api)
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Serve with a minimal static server for the container (nginx in compose will proxy to this or serve files directly)
FROM nginx:alpine AS runner
COPY --from=builder /app/build /usr/share/nginx/html
# Default nginx config just serves static; when behind main nginx proxy we only need to serve static
RUN echo 'server { listen 80; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
