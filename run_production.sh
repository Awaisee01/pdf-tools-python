#!/bin/bash

# RemakePDF Production Server Script
# Run this on your VPS server

# Set environment variables
export FLASK_ENV=production
export SESSION_SECRET=$(openssl rand -hex 32)

# Create necessary directories
mkdir -p uploads processed

# Number of workers (recommended: 2 * CPU cores + 1)
WORKERS=${WORKERS:-4}

# Start gunicorn with production settings
gunicorn \
    --bind 0.0.0.0:5000 \
    --workers $WORKERS \
    --threads 2 \
    --timeout 120 \
    --keep-alive 5 \
    --max-requests 1000 \
    --max-requests-jitter 50 \
    --access-logfile - \
    --error-logfile - \
    --capture-output \
    --enable-stdio-inheritance \
    wsgi:app
