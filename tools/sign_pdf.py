import fitz
import os
import base64
import io
from PIL import Image

def sign_pdf(input_path, output_path, signature_data, position):
    if not signature_data:
        return {'success': False, 'error': 'No signature data provided'}
    try:
        pdf = fitz.open(input_path)
        
        page_num = position.get('page', 1) - 1
        if page_num < 0 or page_num >= len(pdf):
            page_num = 0
        
        page = pdf[page_num]
        
        x = position.get('x', 100)
        y = position.get('y', 100)
        
        if signature_data.startswith('data:image'):
            header, encoded = signature_data.split(',', 1)
            img_data = base64.b64decode(encoded)
            
            img = Image.open(io.BytesIO(img_data))
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            # Remove white background
            datas = img.getdata()
            new_data = []
            for item in datas:
                # Check if pixel is near white (R>200, G>200, B>200)
                if item[0] > 200 and item[1] > 200 and item[2] > 200:
                    new_data.append((255, 255, 255, 0))
                else:
                    new_data.append(item)
            img.putdata(new_data)
            
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='PNG')
            img_bytes.seek(0)
            
            width = min(img.width, 200)
            height = int(width * img.height / img.width)
            
            rect = fitz.Rect(x, y, x + width, y + height)
            page.insert_image(rect, stream=img_bytes.read())
        else:
            font_size = 20
            text_rect = fitz.Rect(x, y, x + 200, y + 30)
            page.insert_textbox(text_rect, signature_data, fontsize=font_size, 
                              fontname="helv", color=(0, 0, 0.5))
        
        pdf.save(output_path)
        pdf.close()
        
        return {'success': True, 'output_path': output_path, 'filename': os.path.basename(output_path)}
    except Exception as e:
        return {'success': False, 'error': str(e)}
