# Use Node.js 22 slim as the base image
FROM node:22-slim

# Install system dependencies in a single layer
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Set working directory
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy Python requirements first for better caching
COPY python/requirements.txt ./python/

# Create virtual environment and install Python dependencies
RUN python3 -m venv /app/venv && \
    /app/venv/bin/pip install --no-cache-dir -r python/requirements.txt

# Copy the rest of the application code (excluding files in .dockerignore)
COPY . .

# Build the Next.js app
RUN npm run build

# Create non-root user for security (Cloud Run best practice)
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

# Cloud Run uses PORT environment variable, so we expose it dynamically
EXPOSE $PORT

# Set environment variables optimized for Cloud Run
ENV NODE_ENV=production
ENV PYTHONPATH=/app/python
ENV PATH="/app/venv/bin:$PATH"

# Cloud Run requires listening on 0.0.0.0 and using PORT env variable
CMD ["sh", "-c", "npm start -- --port=${PORT:-3000} --hostname=0.0.0.0"]