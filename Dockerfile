# Stage 1: Build the Angular app
FROM node:18.16.0 AS builder

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./

# Install node modules
RUN --mount=type=cache,target=/root/.npm npm install --force

# Copy the rest of the application code and build it
COPY . .
RUN npm run build:prod


# Stage 2: Serve the Angular app using Nginx
FROM nginx:1.29.5-alpine

# Copy built app from the builder stage to Nginx's HTML directory
COPY --from=builder /app/dist/text-analyzer-ui /tetherfi/tetherfihome/text-analyzer-ui
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose the port Nginx will use
EXPOSE 5000

# Run Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
