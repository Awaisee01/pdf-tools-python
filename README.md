# PDF Forge

A powerful, all-in-one web-based PDF manipulation tool built with Flask.

## Features
- **Merge & Split PDF**
- **Compress PDF**
- **Convert**: PDF to/from Word, Excel, PowerPoint, JPG
- **Edit & Organize**: Rotate, Crop, Remove Pages, Organize
- **Security**: Protect, Unlock, Watermark, Sign
- **OCR**: Extract text from scanned PDFs

## Prerequisites

Before running the application, you need to install a few system dependencies.

### 1. Python 3.8+
Ensure you have Python installed. You can check with `python --version`.

### 2. Poppler (Required for PDF conversions)
- **Windows**: 
    - Download the latest binary from [github.com/oschwartz10612/poppler-windows/releases/](https://github.com/oschwartz10612/poppler-windows/releases/)
    - Extract the zip file.
    - Add the `bin` folder (e.g., `C:\Program Files\poppler-xx\bin`) to your System **PATH** environment variable.
- **Mac**: `brew install poppler`
- **Linux (Ubuntu)**: `sudo apt install poppler-utils`

### 3. Tesseract OCR (Required for OCR tool)
- **Windows**: 
    - Download the installer from [github.com/UB-Mannheim/tesseract/wiki](https://github.com/UB-Mannheim/tesseract/wiki).
    - Run the installer.
    - Add the installation path (e.g., `C:\Program Files\Tesseract-OCR`) to your System **PATH** environment variable.
- **Mac**: `brew install tesseract`
- **Linux (Ubuntu)**: `sudo apt install tesseract-ocr`

---

## Local Installation & Setup

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/yourusername/pdf-forge.git
    cd pdf-forge
    ```

2.  **Create a Virtual Environment (Recommended)**
    ```bash
    # Windows
    python -m venv venv
    venv\Scripts\activate

    # Mac/Linux
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Install Dependencies**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Run the Application**
    ```bash
    python app.py
    ```
    
    The server will start at `http://127.0.0.1:5000`.

## Production Deployment
For deployment instructions (VPS/Hostinger), please refer to [deployment_guide.md](deployment_guide.md).

## Project Structure
- `app.py`: Main Flask application entry point.
- `tools/`: Contains individual scripts for each PDF operation (merge, split, etc.).
- `templates/`: HTML templates.
- `static/`: CSS, JS, and image assets.
