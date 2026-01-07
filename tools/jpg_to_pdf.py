import fitz
import os
from PIL import Image

def jpg_to_pdf(input_files, output_path):
    try:
        pdf = fitz.open()
        
        for img_path in input_files:
            img = Image.open(img_path)
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            
            img_width, img_height = img.size
            
            page = pdf.new_page(width=img_width, height=img_height)
            
            import io
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='JPEG', quality=95)
            img_bytes.seek(0)
            
            rect = fitz.Rect(0, 0, img_width, img_height)
            page.insert_image(rect, stream=img_bytes.read())
        
        pdf.save(output_path)
        pdf.close()
        
        return {'success': True, 'output_path': output_path, 'filename': os.path.basename(output_path)}
    except Exception as e:
        return {'success': False, 'error': str(e)}
