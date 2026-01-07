FROM python:3.9-slim

# Install system dependencies
# poppler-utils is for pdf2image/pdf conversions
# tesseract-ocr is for OCR functionality
RUN apt-get update && apt-get install -y \
    poppler-utils \
    tesseract-ocr \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn

# Copy application code
COPY . .

# Create temp directories for the app if they don't exist
# (Though the app creates them in /tmp/pdf-forge by default, 
# ensuring permissions or structure check is good)

# Expose port
EXPOSE 8000

# Run Gunicorn
CMD ["gunicorn", "-c", "gunicorn_config.py", "app:app"]
