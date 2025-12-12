import os
import uuid
import shutil
from flask import Flask, render_template, request, send_file, redirect, url_for, jsonify, session
from werkzeug.utils import secure_filename
import threading
import time
import atexit

from tools.merge_pdf import merge_pdfs
from tools.split_pdf import split_pdf
from tools.compress_pdf import compress_pdf
from tools.rotate_pdf import rotate_pdf
from tools.crop_pdf import crop_pdf
from tools.remove_pages import remove_pages
from tools.organize_pdf import organize_pdf
from tools.pdf_to_jpg import pdf_to_jpg
from tools.jpg_to_pdf import jpg_to_pdf
from tools.pdf_to_word import pdf_to_word
from tools.word_to_pdf import word_to_pdf
from tools.excel_to_pdf import excel_to_pdf
from tools.pptx_to_pdf import pptx_to_pdf
from tools.extract_pdf import extract_text, extract_images
from tools.ocr_pdf import ocr_pdf
from tools.unlock_pdf import unlock_pdf
from tools.protect_pdf import protect_pdf
from tools.sign_pdf import sign_pdf
from tools.watermark_pdf import watermark_pdf
from tools.edit_pdf import edit_pdf, extract_text_blocks

app = Flask(__name__)
app.secret_key = os.environ.get('SESSION_SECRET', 'dev-secret-key-change-in-production')

UPLOAD_FOLDER = 'uploads'
PROCESSED_FOLDER = 'processed'
ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png', 'docx', 'xlsx', 'pptx'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

def allowed_file(filename, extensions=None):
    if extensions is None:
        extensions = ALLOWED_EXTENSIONS
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in extensions

def generate_unique_filename(original_filename):
    ext = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
    unique_id = str(uuid.uuid4())[:8]
    base_name = secure_filename(original_filename.rsplit('.', 1)[0] if '.' in original_filename else original_filename)
    return f"{base_name}_{unique_id}.{ext}" if ext else f"{base_name}_{unique_id}"

def cleanup_file(filepath, delay=300):
    def delete_after_delay():
        time.sleep(delay)
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
        except Exception as e:
            print(f"Error cleaning up {filepath}: {e}")
    thread = threading.Thread(target=delete_after_delay)
    thread.daemon = True
    thread.start()

def cleanup_folder(folderpath, delay=300):
    def delete_after_delay():
        time.sleep(delay)
        try:
            if os.path.exists(folderpath):
                shutil.rmtree(folderpath)
        except Exception as e:
            print(f"Error cleaning up {folderpath}: {e}")
    thread = threading.Thread(target=delete_after_delay)
    thread.daemon = True
    thread.start()

FILE_MAX_AGE_SECONDS = 1800
CLEANUP_INTERVAL_SECONDS = 300
cleanup_thread_running = True

def auto_cleanup_old_files():
    while cleanup_thread_running:
        try:
            current_time = time.time()
            for folder in [UPLOAD_FOLDER, PROCESSED_FOLDER]:
                if not os.path.exists(folder):
                    continue
                for item in os.listdir(folder):
                    item_path = os.path.join(folder, item)
                    try:
                        if os.path.isfile(item_path):
                            file_age = current_time - os.path.getmtime(item_path)
                            if file_age > FILE_MAX_AGE_SECONDS:
                                os.remove(item_path)
                                print(f"Auto-deleted old file: {item_path}")
                        elif os.path.isdir(item_path):
                            folder_age = current_time - os.path.getmtime(item_path)
                            if folder_age > FILE_MAX_AGE_SECONDS:
                                shutil.rmtree(item_path)
                                print(f"Auto-deleted old folder: {item_path}")
                    except Exception as e:
                        print(f"Error deleting {item_path}: {e}")
        except Exception as e:
            print(f"Error in auto cleanup: {e}")
        time.sleep(CLEANUP_INTERVAL_SECONDS)

def start_cleanup_scheduler():
    cleanup_thread = threading.Thread(target=auto_cleanup_old_files, daemon=True)
    cleanup_thread.start()
    print(f"Background cleanup scheduler started (deletes files older than {FILE_MAX_AGE_SECONDS // 60} minutes)")

def stop_cleanup_scheduler():
    global cleanup_thread_running
    cleanup_thread_running = False

start_cleanup_scheduler()
atexit.register(stop_cleanup_scheduler)

@app.route('/')
def index():
    tools = [
        {'name': 'Merge PDF', 'icon': 'merge', 'description': 'Combine multiple PDFs into one', 'url': '/tool/merge', 'color': '#e74c3c'},
        {'name': 'Split PDF', 'icon': 'split', 'description': 'Separate PDF pages', 'url': '/tool/split', 'color': '#3498db'},
        {'name': 'Compress PDF', 'icon': 'compress', 'description': 'Reduce PDF file size', 'url': '/tool/compress', 'color': '#2ecc71'},
        {'name': 'Rotate PDF', 'icon': 'rotate', 'description': 'Rotate PDF pages', 'url': '/tool/rotate', 'color': '#9b59b6'},
        {'name': 'Crop PDF', 'icon': 'crop', 'description': 'Crop PDF page margins', 'url': '/tool/crop', 'color': '#f39c12'},
        {'name': 'Remove Pages', 'icon': 'remove', 'description': 'Delete pages from PDF', 'url': '/tool/remove-pages', 'color': '#e67e22'},
        {'name': 'Organize PDF', 'icon': 'organize', 'description': 'Reorder PDF pages', 'url': '/tool/organize', 'color': '#1abc9c'},
        {'name': 'PDF to JPG', 'icon': 'image', 'description': 'Convert PDF to images', 'url': '/tool/pdf-to-jpg', 'color': '#e91e63'},
        {'name': 'JPG to PDF', 'icon': 'pdf', 'description': 'Convert images to PDF', 'url': '/tool/jpg-to-pdf', 'color': '#673ab7'},
        {'name': 'PDF to Word', 'icon': 'word', 'description': 'Extract PDF text to DOCX', 'url': '/tool/pdf-to-word', 'color': '#2196f3'},
        {'name': 'Word to PDF', 'icon': 'word-pdf', 'description': 'Convert Word text to PDF', 'url': '/tool/word-to-pdf', 'color': '#00bcd4'},
        {'name': 'Excel to PDF', 'icon': 'excel', 'description': 'Convert Excel data to PDF', 'url': '/tool/excel-to-pdf', 'color': '#4caf50'},
        {'name': 'PowerPoint to PDF', 'icon': 'pptx', 'description': 'Convert slides text to PDF', 'url': '/tool/pptx-to-pdf', 'color': '#ff5722'},
        {'name': 'Extract Content', 'icon': 'extract', 'description': 'Extract text & images', 'url': '/tool/extract', 'color': '#795548'},
        {'name': 'OCR PDF', 'icon': 'ocr', 'description': 'Extract text from scans', 'url': '/tool/ocr', 'color': '#607d8b'},
        {'name': 'Unlock PDF', 'icon': 'unlock', 'description': 'Remove PDF password', 'url': '/tool/unlock', 'color': '#ff9800'},
        {'name': 'Protect PDF', 'icon': 'lock', 'description': 'Add password to PDF', 'url': '/tool/protect', 'color': '#f44336'},
        {'name': 'Sign PDF', 'icon': 'sign', 'description': 'Add signature to PDF', 'url': '/tool/sign', 'color': '#3f51b5'},
        {'name': 'Watermark PDF', 'icon': 'watermark', 'description': 'Add watermark to PDF', 'url': '/tool/watermark', 'color': '#009688'},
        {'name': 'Edit PDF', 'icon': 'edit', 'description': 'Add text & images', 'url': '/tool/edit', 'color': '#8bc34a'},
    ]
    return render_template('index.html', tools=tools)

@app.route('/tool/<tool_name>')
def tool_page(tool_name):
    tool_info = {
        'merge': {'title': 'Merge PDF', 'description': 'Combine multiple PDF files into a single document', 'accept': '.pdf', 'multiple': True, 'icon': 'merge', 'color': '#e74c3c'},
        'split': {'title': 'Split PDF', 'description': 'Separate a PDF into individual pages or custom ranges', 'accept': '.pdf', 'multiple': False, 'icon': 'split', 'color': '#3498db'},
        'compress': {'title': 'Compress PDF', 'description': 'Reduce the file size of your PDF', 'accept': '.pdf', 'multiple': False, 'icon': 'compress', 'color': '#2ecc71'},
        'rotate': {'title': 'Rotate PDF', 'description': 'Rotate PDF pages to any angle', 'accept': '.pdf', 'multiple': False, 'icon': 'rotate', 'color': '#9b59b6'},
        'crop': {'title': 'Crop PDF', 'description': 'Remove margins from PDF pages', 'accept': '.pdf', 'multiple': False, 'icon': 'crop', 'color': '#f39c12'},
        'remove-pages': {'title': 'Remove Pages', 'description': 'Delete specific pages from your PDF', 'accept': '.pdf', 'multiple': False, 'icon': 'remove', 'color': '#e67e22'},
        'organize': {'title': 'Organize PDF', 'description': 'Reorder pages in your PDF document', 'accept': '.pdf', 'multiple': False, 'icon': 'organize', 'color': '#1abc9c'},
        'pdf-to-jpg': {'title': 'PDF to JPG', 'description': 'Convert PDF pages to JPG images', 'accept': '.pdf', 'multiple': False, 'icon': 'image', 'color': '#e91e63'},
        'jpg-to-pdf': {'title': 'JPG to PDF', 'description': 'Convert JPG images to a PDF document', 'accept': '.jpg,.jpeg,.png', 'multiple': True, 'icon': 'pdf', 'color': '#673ab7'},
        'pdf-to-word': {'title': 'PDF to Word', 'description': 'Extract text from PDF into an editable Word document. Best for text-heavy PDFs.', 'accept': '.pdf', 'multiple': False, 'icon': 'word', 'color': '#2196f3'},
        'word-to-pdf': {'title': 'Word to PDF', 'description': 'Convert Word document text content to PDF format.', 'accept': '.docx', 'multiple': False, 'icon': 'word-pdf', 'color': '#00bcd4'},
        'excel-to-pdf': {'title': 'Excel to PDF', 'description': 'Convert Excel spreadsheet data to PDF table format.', 'accept': '.xlsx', 'multiple': False, 'icon': 'excel', 'color': '#4caf50'},
        'pptx-to-pdf': {'title': 'PowerPoint to PDF', 'description': 'Convert PowerPoint slide text content to PDF format.', 'accept': '.pptx', 'multiple': False, 'icon': 'pptx', 'color': '#ff5722'},
        'extract': {'title': 'Extract Content', 'description': 'Extract text and images from PDF', 'accept': '.pdf', 'multiple': False, 'icon': 'extract', 'color': '#795548'},
        'ocr': {'title': 'OCR PDF', 'description': 'Extract text from scanned PDF using OCR', 'accept': '.pdf', 'multiple': False, 'icon': 'ocr', 'color': '#607d8b'},
        'unlock': {'title': 'Unlock PDF', 'description': 'Remove password protection from PDF', 'accept': '.pdf', 'multiple': False, 'icon': 'unlock', 'color': '#ff9800'},
        'protect': {'title': 'Protect PDF', 'description': 'Add password protection to PDF', 'accept': '.pdf', 'multiple': False, 'icon': 'lock', 'color': '#f44336'},
        'sign': {'title': 'Sign PDF', 'description': 'Add your signature to PDF', 'accept': '.pdf', 'multiple': False, 'icon': 'sign', 'color': '#3f51b5'},
        'watermark': {'title': 'Watermark PDF', 'description': 'Add text or image watermark to PDF', 'accept': '.pdf', 'multiple': False, 'icon': 'watermark', 'color': '#009688'},
        'edit': {'title': 'Edit PDF', 'description': 'Add text and images to your PDF', 'accept': '.pdf', 'multiple': False, 'icon': 'edit', 'color': '#8bc34a'},
    }
    
    if tool_name not in tool_info:
        return redirect(url_for('index'))
    
    info = tool_info[tool_name]
    
    if tool_name == 'split':
        return render_template('tool_split.html', tool_name=tool_name, **info)
    elif tool_name == 'sign':
        return render_template('tool_sign.html', tool_name=tool_name, **info)
    elif tool_name == 'edit':
        return render_template('tool_edit.html', tool_name=tool_name, **info)
    elif tool_name == 'organize':
        return render_template('tool_organize.html', tool_name=tool_name, **info)
    elif tool_name == 'merge':
        return render_template('tool_merge.html', tool_name=tool_name, **info)
    elif tool_name == 'crop':
        return render_template('tool_crop.html', tool_name=tool_name, **info)
    
    return render_template('tool.html', tool_name=tool_name, **info)

@app.route('/process/<tool_name>', methods=['POST'])
def process_tool(tool_name):
    try:
        if 'file' not in request.files and 'files' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        files = request.files.getlist('files') if 'files' in request.files else [request.files['file']]
        
        if not files or all(f.filename == '' for f in files):
            return jsonify({'error': 'No file selected'}), 400
        
        saved_files = []
        for f in files:
            if f and f.filename:
                filename = generate_unique_filename(f.filename)
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                f.save(filepath)
                saved_files.append(filepath)
                cleanup_file(filepath)
        
        if not saved_files:
            return jsonify({'error': 'No valid files uploaded'}), 400
        
        result = None
        output_filename = None
        
        if tool_name == 'merge':
            output_filename = 'merged.pdf'
            output_path = os.path.join(PROCESSED_FOLDER, generate_unique_filename(output_filename))
            result = merge_pdfs(saved_files, output_path)
        
        elif tool_name == 'split':
            split_type = request.form.get('split_type', 'all')
            pages = request.form.get('pages', '')
            output_folder = os.path.join(PROCESSED_FOLDER, str(uuid.uuid4())[:8])
            os.makedirs(output_folder, exist_ok=True)
            result = split_pdf(saved_files[0], output_folder, split_type, pages)
            cleanup_folder(output_folder)
        
        elif tool_name == 'compress':
            quality = request.form.get('quality', 'medium')
            output_filename = 'compressed.pdf'
            output_path = os.path.join(PROCESSED_FOLDER, generate_unique_filename(output_filename))
            result = compress_pdf(saved_files[0], output_path, quality)
        
        elif tool_name == 'rotate':
            angle = int(request.form.get('angle', 90))
            pages = request.form.get('pages', 'all')
            output_filename = 'rotated.pdf'
            output_path = os.path.join(PROCESSED_FOLDER, generate_unique_filename(output_filename))
            result = rotate_pdf(saved_files[0], output_path, angle, pages)
        
        elif tool_name == 'crop':
            margins = {
                'top': float(request.form.get('top', 0)),
                'bottom': float(request.form.get('bottom', 0)),
                'left': float(request.form.get('left', 0)),
                'right': float(request.form.get('right', 0))
            }
            pages = request.form.get('pages', 'all')
            current_page = int(request.form.get('current_page', 1))
            output_filename = 'cropped.pdf'
            output_path = os.path.join(PROCESSED_FOLDER, generate_unique_filename(output_filename))
            result = crop_pdf(saved_files[0], output_path, margins, pages, current_page)
        
        elif tool_name == 'remove-pages':
            pages = request.form.get('pages', '')
            output_filename = 'pages_removed.pdf'
            output_path = os.path.join(PROCESSED_FOLDER, generate_unique_filename(output_filename))
            result = remove_pages(saved_files[0], output_path, pages)
        
        elif tool_name == 'organize':
            order = request.form.get('order', '')
            output_filename = 'organized.pdf'
            output_path = os.path.join(PROCESSED_FOLDER, generate_unique_filename(output_filename))
            result = organize_pdf(saved_files[0], output_path, order)
        
        elif tool_name == 'pdf-to-jpg':
            dpi = int(request.form.get('dpi', 150))
            output_folder = os.path.join(PROCESSED_FOLDER, str(uuid.uuid4())[:8])
            os.makedirs(output_folder, exist_ok=True)
            result = pdf_to_jpg(saved_files[0], output_folder, dpi)
            cleanup_folder(output_folder)
        
        elif tool_name == 'jpg-to-pdf':
            output_filename = 'images.pdf'
            output_path = os.path.join(PROCESSED_FOLDER, generate_unique_filename(output_filename))
            result = jpg_to_pdf(saved_files, output_path)
        
        elif tool_name == 'pdf-to-word':
            output_filename = 'document.docx'
            output_path = os.path.join(PROCESSED_FOLDER, generate_unique_filename(output_filename))
            result = pdf_to_word(saved_files[0], output_path)
        
        elif tool_name == 'word-to-pdf':
            output_filename = 'document.pdf'
            output_path = os.path.join(PROCESSED_FOLDER, generate_unique_filename(output_filename))
            result = word_to_pdf(saved_files[0], output_path)
        
        elif tool_name == 'excel-to-pdf':
            output_filename = 'spreadsheet.pdf'
            output_path = os.path.join(PROCESSED_FOLDER, generate_unique_filename(output_filename))
            result = excel_to_pdf(saved_files[0], output_path)
        
        elif tool_name == 'pptx-to-pdf':
            output_filename = 'presentation.pdf'
            output_path = os.path.join(PROCESSED_FOLDER, generate_unique_filename(output_filename))
            result = pptx_to_pdf(saved_files[0], output_path)
        
        elif tool_name == 'extract':
            extract_type = request.form.get('extract_type', 'text')
            output_folder = os.path.join(PROCESSED_FOLDER, str(uuid.uuid4())[:8])
            os.makedirs(output_folder, exist_ok=True)
            if extract_type == 'text':
                result = extract_text(saved_files[0], output_folder)
            else:
                result = extract_images(saved_files[0], output_folder)
            cleanup_folder(output_folder)
        
        elif tool_name == 'ocr':
            language = request.form.get('language', 'eng')
            output_filename = 'ocr_result.pdf'
            output_path = os.path.join(PROCESSED_FOLDER, generate_unique_filename(output_filename))
            result = ocr_pdf(saved_files[0], output_path, language)
        
        elif tool_name == 'unlock':
            password = request.form.get('password', '')
            output_filename = 'unlocked.pdf'
            output_path = os.path.join(PROCESSED_FOLDER, generate_unique_filename(output_filename))
            result = unlock_pdf(saved_files[0], output_path, password)
        
        elif tool_name == 'protect':
            password = request.form.get('password', '')
            output_filename = 'protected.pdf'
            output_path = os.path.join(PROCESSED_FOLDER, generate_unique_filename(output_filename))
            result = protect_pdf(saved_files[0], output_path, password)
        
        elif tool_name == 'sign':
            signature_data = request.form.get('signature', '')
            position = {
                'x': float(request.form.get('x', 100)),
                'y': float(request.form.get('y', 100)),
                'page': int(request.form.get('page', 1))
            }
            output_filename = 'signed.pdf'
            output_path = os.path.join(PROCESSED_FOLDER, generate_unique_filename(output_filename))
            result = sign_pdf(saved_files[0], output_path, signature_data, position)
        
        elif tool_name == 'watermark':
            watermark_text = request.form.get('text', 'WATERMARK')
            opacity = float(request.form.get('opacity', 0.3))
            output_filename = 'watermarked.pdf'
            output_path = os.path.join(PROCESSED_FOLDER, generate_unique_filename(output_filename))
            result = watermark_pdf(saved_files[0], output_path, watermark_text, opacity)
        
        elif tool_name == 'edit':
            import json
            edits_json = request.form.get('edits', '[]')
            try:
                edits = json.loads(edits_json)
            except:
                edits = []
            output_filename = 'edited.pdf'
            output_path = os.path.join(PROCESSED_FOLDER, generate_unique_filename(output_filename))
            result = edit_pdf(saved_files[0], output_path, edits)
        
        else:
            return jsonify({'error': 'Unknown tool'}), 400
        
        if result and result.get('success'):
            if 'output_path' in result:
                cleanup_file(result['output_path'])
            return jsonify(result)
        else:
            return jsonify({'error': result.get('error', 'Processing failed')}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/download/<path:filename>')
def download_file(filename):
    filepath = os.path.join(PROCESSED_FOLDER, filename)
    if os.path.exists(filepath):
        return send_file(filepath, as_attachment=True)
    return jsonify({'error': 'File not found'}), 404

@app.route('/download-folder/<folder_id>')
def download_folder(folder_id):
    folder_path = os.path.join(PROCESSED_FOLDER, folder_id)
    if os.path.exists(folder_path):
        zip_path = os.path.join(PROCESSED_FOLDER, f"{folder_id}.zip")
        shutil.make_archive(zip_path.replace('.zip', ''), 'zip', folder_path)
        cleanup_file(zip_path)
        return send_file(zip_path, as_attachment=True)
    return jsonify({'error': 'Folder not found'}), 404

@app.route('/api/extract-text-blocks', methods=['POST'])
def api_extract_text_blocks():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        filename = generate_unique_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        cleanup_file(filepath)
        
        result = extract_text_blocks(filepath)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
