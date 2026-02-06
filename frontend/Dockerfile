# Build stage
FROM node:20-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build with production API URL (set via Railway env var)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port (Railway will use PORT env var)
EXPOSE 80

# Start nginx
CMD ["sh", "-c", "sed -i 's/listen 80/listen ${PORT:-80}/g' /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
