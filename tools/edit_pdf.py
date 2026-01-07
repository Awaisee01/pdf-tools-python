import fitz
import json
import base64
from io import BytesIO
from PIL import Image

def extract_text_blocks(input_path):
    """Extract text lines with their positions from a PDF (one line at a time)."""
    try:
        pdf = fitz.open(input_path)
        pages_data = []
        
        for page_num in range(len(pdf)):
            page = pdf[page_num]
            page_dict = page.get_text("dict")
            
            text_blocks = []
            line_idx = 0
            
            for block in page_dict.get("blocks", []):
                if block.get("type") == 0:
                    for line in block.get("lines", []):
                        line_text = ""
                        font_size = 12
                        font_name = "helv"
                        
                        spans = line.get("spans", [])
                        if not spans:
                            continue
                        
                        for span in spans:
                            line_text += span.get("text", "")
                            if not font_size or font_size == 12:
                                font_size = span.get("size", 12)
                                font_name = span.get("font", "helv")
                        
                        line_text = line_text.strip()
                        if not line_text:
                            continue
                        
                        line_bbox = line.get("bbox", [0, 0, 100, 20])
                        
                        text_blocks.append({
                            "id": f"line_{page_num}_{line_idx}",
                            "text": line_text,
                            "x": line_bbox[0],
                            "y": line_bbox[1],
                            "width": line_bbox[2] - line_bbox[0],
                            "height": line_bbox[3] - line_bbox[1],
                            "font_size": font_size,
                            "font_name": font_name,
                            "page": page_num + 1
                        })
                        line_idx += 1
            
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
        
        return {'success': True, 'output_path': output_path, 'filename': os.path.basename(output_path)}
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
        
        return {'success': True, 'output_path': output_path, 'filename': os.path.basename(output_path)}
    except Exception as e:
        return {'success': False, 'error': str(e)}
