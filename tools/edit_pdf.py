import fitz
import json
import base64
from io import BytesIO
from PIL import Image

def extract_text_blocks(input_path):
    """Extract individual words with their positions from a PDF."""
    try:
        pdf = fitz.open(input_path)
        pages_data = []
        
        for page_num in range(len(pdf)):
            page = pdf[page_num]
            words = page.get_text("words")
            page_dict = page.get_text("dict")
            
            font_info = {}
            for block in page_dict.get("blocks", []):
                if block.get("type") == 0:
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            bbox = span.get("bbox", [0, 0, 0, 0])
                            key = f"{int(bbox[0])}_{int(bbox[1])}"
                            font_info[key] = {
                                "size": span.get("size", 12),
                                "font": span.get("font", "helv")
                            }
            
            text_blocks = []
            for idx, word_data in enumerate(words):
                x0, y0, x1, y1, word, block_no, line_no, word_no = word_data
                
                word = word.strip()
                if not word:
                    continue
                
                key = f"{int(x0)}_{int(y0)}"
                info = font_info.get(key, {"size": 12, "font": "helv"})
                
                text_blocks.append({
                    "id": f"word_{page_num}_{idx}",
                    "text": word,
                    "x": x0,
                    "y": y0,
                    "width": x1 - x0,
                    "height": y1 - y0,
                    "font_size": info["size"],
                    "font_name": info["font"],
                    "page": page_num + 1
                })
            
            pages_data.append({
                "page": page_num + 1,
                "width": page.rect.width,
                "height": page.rect.height,
                "text_blocks": text_blocks
            })
        
        pdf.close()
        return {"success": True, "pages": pages_data}
    except Exception as e:
        return {"success": False, "error": str(e)}

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple (0-1 range)."""
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 6:
        r = int(hex_color[0:2], 16) / 255
        g = int(hex_color[2:4], 16) / 255
        b = int(hex_color[4:6], 16) / 255
        return (r, g, b)
    return (0, 0, 0)

def edit_pdf(input_path, output_path, edits):
    """
    Apply edits to a PDF.
    Supports: text, image, signature, whiteout, shape, modify, add, delete
    """
    try:
        pdf = fitz.open(input_path)
        
        for edit in edits:
            page_num = edit.get('page', 1) - 1
            if page_num < 0 or page_num >= len(pdf):
                continue
            
            page = pdf[page_num]
            edit_type = edit.get('type', 'add')
            
            if edit_type == 'text':
                x = edit.get('x', 100)
                y = edit.get('y', 100)
                content = edit.get('content', '')
                font_size = edit.get('fontSize', 14)
                color = edit.get('color', '#000000')
                
                if isinstance(color, str):
                    color = hex_to_rgb(color)
                elif isinstance(color, list):
                    color = tuple(c if c <= 1 else c/255 for c in color)
                
                if content:
                    text_point = fitz.Point(x, y + font_size)
                    page.insert_text(text_point, content, fontsize=font_size,
                                   fontname="helv", color=color)
            
            elif edit_type in ('image', 'signature'):
                x = edit.get('x', 100)
                y = edit.get('y', 100)
                width = edit.get('width', 150)
                height = edit.get('height', 100)
                data = edit.get('data', '')
                
                if data and data.startswith('data:'):
                    base64_data = data.split(',')[1] if ',' in data else data
                    img_bytes = base64.b64decode(base64_data)
                    
                    img_rect = fitz.Rect(x, y, x + width, y + height)
                    page.insert_image(img_rect, stream=img_bytes)
            
            elif edit_type == 'whiteout':
                x = edit.get('x', 0)
                y = edit.get('y', 0)
                width = edit.get('width', 100)
                height = edit.get('height', 20)
                
                rect = fitz.Rect(x, y, x + width, y + height)
                page.draw_rect(rect, color=(1, 1, 1), fill=(1, 1, 1))
            
            elif edit_type == 'shape':
                x = edit.get('x', 0)
                y = edit.get('y', 0)
                width = edit.get('width', 100)
                height = edit.get('height', 100)
                shape_type = edit.get('shape', 'rectangle')
                color = edit.get('color', '#000000')
                
                if isinstance(color, str):
                    color = hex_to_rgb(color)
                
                rect = fitz.Rect(x, y, x + width, y + height)
                
                if shape_type == 'circle':
                    center = fitz.Point(x + width/2, y + height/2)
                    radius = min(width, height) / 2
                    page.draw_circle(center, radius, color=color, width=2)
                else:
                    page.draw_rect(rect, color=color, width=2)
            
            elif edit_type == 'modify':
                rect = edit.get('original_rect', [0, 0, 100, 20])
                fitz_rect = fitz.Rect(rect[0], rect[1], rect[0] + rect[2], rect[1] + rect[3])
                
                page.add_redact_annot(fitz_rect, fill=(1, 1, 1))
                page.apply_redactions()
                
                new_text = edit.get('new_text', '')
                font_size = edit.get('font_size', 12)
                font_name = edit.get('font_name', 'helv')
                color = edit.get('color', '#000000')
                
                if isinstance(color, str):
                    color = hex_to_rgb(color)
                elif isinstance(color, list):
                    color = tuple(c if c <= 1 else c/255 for c in color)
                
                if new_text:
                    text_point = fitz.Point(rect[0], rect[1] + font_size)
                    page.insert_text(text_point, new_text, fontsize=font_size, 
                                   fontname=font_name, color=color)
            
            elif edit_type == 'add':
                x = edit.get('x', 100)
                y = edit.get('y', 100)
                text = edit.get('text', '')
                font_size = edit.get('font_size', 12)
                color = edit.get('color', [0, 0, 0])
                
                if text:
                    text_point = fitz.Point(x, y + font_size)
                    page.insert_text(text_point, text, fontsize=font_size,
                                   fontname="helv", color=tuple(color))
            
            elif edit_type == 'delete':
                rect = edit.get('rect', [0, 0, 100, 20])
                fitz_rect = fitz.Rect(rect[0], rect[1], rect[0] + rect[2], rect[1] + rect[3])
                page.add_redact_annot(fitz_rect, fill=(1, 1, 1))
                page.apply_redactions()
        
        pdf.save(output_path)
        pdf.close()
        
        return {'success': True, 'output_path': output_path, 'filename': output_path.split('/')[-1]}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def add_text_to_pdf(input_path, output_path, text_content, position):
    """Legacy function for simple text addition."""
    try:
        pdf = fitz.open(input_path)
        
        page_num = position.get('page', 1) - 1
        if page_num < 0 or page_num >= len(pdf):
            page_num = 0
        
        page = pdf[page_num]
        
        x = position.get('x', 100)
        y = position.get('y', 100)
        font_size = position.get('font_size', 12)
        
        if text_content:
            text_point = fitz.Point(x, y + font_size)
            page.insert_text(text_point, text_content, fontsize=font_size,
                           fontname="helv", color=(0, 0, 0))
        
        pdf.save(output_path)
        pdf.close()
        
        return {'success': True, 'output_path': output_path, 'filename': output_path.split('/')[-1]}
    except Exception as e:
        return {'success': False, 'error': str(e)}
