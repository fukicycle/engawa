# Use lightweight Node Alpine image
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package configurations
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy application files
COPY index.js ./

# Set environment variables
ENV NODE_ENV=production

# Run notification worker
CMD [ "node", "index.js" ]
