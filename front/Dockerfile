FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first to leverage Docker layer cache
COPY package*.json ./
RUN npm ci

# Build the React application with a configurable API base URL
ARG REACT_APP_API_BASE_URL=http://localhost:8080
ENV REACT_APP_API_BASE_URL=${REACT_APP_API_BASE_URL}

COPY . .
RUN npm run build

# Serve the compiled app with Nginx
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
