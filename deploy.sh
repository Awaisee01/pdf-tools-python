#!/bin/bash

# Exit on error
set -e

echo ">>> Starting PDF-Forge Deployment Setup..."

# 1. System Updates & Dependencies
echo ">>> Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y python3-pip python3-venv python3-dev build-essential \
    libpcre3 libpcre3-dev \
    poppler-utils \
    tesseract-ocr \
    libgl1-mesa-glx

# 2. Virtual Environment Setup
echo ">>> Setting up Python virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "    Created 'venv' directory."
else
    echo "    'venv' directory already exists."
fi

# Activate venv
source venv/bin/activate

# 3. Python Dependencies
echo ">>> Installing Python packages from requirements.txt..."
pip install --upgrade pip
pip install -r requirements.txt

# 4. Permissions (Optional but recommended for upload folders)
echo ">>> Setting permissions..."
mkdir -p uploads processed
chmod 777 uploads processed

echo ">>> Deployment Setup Complete!"
echo "    You can now test the app with:"
echo "    ./venv/bin/gunicorn -c gunicorn_config.py app:app"
