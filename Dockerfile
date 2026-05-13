# Use the official Node.js 20 image.
FROM node:20-slim AS build

# Create and change to the app directory.
WORKDIR /app

# Copy application dependency manifests to the container image.
COPY package*.json ./

# Install dependencies.
RUN npm install

# Copy local code to the container image.
COPY . .

# Build the production assets.
RUN npm run build

# Use a separate stage for the runtime to keep the image small.
FROM node:20-slim

WORKDIR /app

# Install 'serve' to serve the static assets.
RUN npm install -g serve

# Copy only the built assets from the build stage.
COPY --from=build /app/dist ./dist

# Standardize on port 3000 for the container.
# Cloud Run will automatically route traffic to this port if configured,
# or we can listen to the PORT env var.
ENV PORT=3000

# Expose the port.
EXPOSE 3000

# Run the web service on container startup.
# We use sh -c to allow environment variable expansion for PORT.
CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]
