# Use Node.js 22 slim as the base image
FROM node:22-slim

# Install Python 3.10 and dependencies
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3.10-venv \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Node.js dependency files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the Next.js application code and python folder
COPY . .

# Build the Next.js app
RUN npm run build

# Create a Python virtual environment
RUN python3.10 -m venv /app/venv

# Activate virtual environment and install Python dependencies from python/requirements.txt
RUN . /app/venv/bin/activate && \
    pip install --no-cache-dir -r python/requirements.txt

# Expose port 3000 for Next.js
EXPOSE 3000

# Set environment variable to ensure Python uses the virtual environment
ENV PATH="/app/venv/bin:$PATH"

# Command to run the Next.js app
CMD ["npm", "start"]