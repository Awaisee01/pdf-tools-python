# RemakePdf Website

A comprehensive PDF toolkit web application built with Python Flask and local libraries.

## Overview
This is a fully functional PDF tool website with 20+ tools for manipulating, converting, and editing PDF files. All processing happens locally on the server without using any external APIs.

## Features
- **Merge PDF**: Combine multiple PDFs into one
- **Split PDF**: Separate PDF pages
- **Compress PDF**: Reduce PDF file size
- **Rotate PDF**: Rotate PDF pages
- **Crop PDF**: Remove margins from PDF pages
- **Remove Pages**: Delete specific pages
- **Organize PDF**: Reorder pages
- **PDF to JPG**: Convert PDF to images
- **JPG to PDF**: Convert images to PDF
- **PDF to Word**: Convert PDF to DOCX
- **Word to PDF**: Convert DOCX to PDF
- **Excel to PDF**: Convert XLSX to PDF
- **PowerPoint to PDF**: Convert PPTX to PDF
- **Extract Content**: Extract text and images
- **OCR PDF**: Extract text from scanned PDFs
- **Unlock PDF**: Remove password protection
- **Protect PDF**: Add password protection
- **Sign PDF**: Add signature to PDF
- **Watermark PDF**: Add watermark to PDF
- **Edit PDF**: Add text to PDF

## Tech Stack
- **Backend**: Python Flask
- **PDF Libraries**: PyMuPDF (fitz), PyPDF2, reportlab, pdf2image
- **Document Libraries**: python-docx, openpyxl, python-pptx
- **OCR**: pytesseract with Tesseract OCR engine
- **Image Processing**: Pillow
- **Frontend**: HTML5, CSS3, JavaScript (vanilla)

## Project Structure
```
/
├── app.py              # Main Flask application
├── tools/              # PDF processing modules
│   ├── merge_pdf.py
│   ├── split_pdf.py
│   ├── compress_pdf.py
│   ├── rotate_pdf.py
│   ├── crop_pdf.py
│   ├── remove_pages.py
│   ├── organize_pdf.py
│   ├── pdf_to_jpg.py
│   ├── jpg_to_pdf.py
│   ├── pdf_to_word.py
│   ├── word_to_pdf.py
│   ├── excel_to_pdf.py
│   ├── pptx_to_pdf.py
│   ├── extract_pdf.py
│   ├── ocr_pdf.py
│   ├── unlock_pdf.py
│   ├── protect_pdf.py
│   ├── sign_pdf.py
│   ├── watermark_pdf.py
│   └── edit_pdf.py
├── templates/          # HTML templates
│   ├── base.html
│   ├── index.html
│   ├── tool.html
│   └── icons/         # SVG icons
├── static/
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── main.js
│       ├── upload.js
│       └── signature.js
├── uploads/            # Temporary upload folder (auto-cleanup)
└── processed/          # Processed files (auto-cleanup)
```

## Security Features
- **Background auto-delete scheduler**: Files are automatically deleted after 30 minutes
- Cleanup runs every 5 minutes to check for old files in uploads/ and processed/ folders
- Per-file cleanup also runs for immediate deletion after 5 minutes
- No files are stored permanently
- All processing happens locally
- Session-based management

## Auto-Delete Configuration (in app.py)
- `FILE_MAX_AGE_SECONDS = 1800` - Files older than 30 minutes are deleted
- `CLEANUP_INTERVAL_SECONDS = 300` - Cleanup check runs every 5 minutes

## Running the Application
The application runs on port 5000 and is configured to run with Flask's development server.
