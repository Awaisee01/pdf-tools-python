import fitz
import base64
import io
from PIL import Image

def sign_pdf(input_path, output_path, signature_data, position):
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
            if img.mode == 'RGBA':
                background = Image.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[-1])
                img = background
            
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
        
        return {'success': True, 'output_path': output_path, 'filename': output_path.split('/')[-1]}
    except Exception as e:
        return {'success': False, 'error': str(e)}
