import fitz
import os
import json
import base64
from io import BytesIO
from PIL import Image
import re

UNICODE_FONT_PATH = "C:\\Windows\\Fonts\\Nirmala.ttf"

def has_hindi(text):
    """Check if text contains Hindi (Devanagari) characters."""
    return any(u'\u0900' <= char <= u'\u097f' for char in text)

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
            
            # Extract images positions for deletion
            image_blocks = []
            for img_idx, img in enumerate(page.get_images()):
                xref = img[0]
                # Get the image placement on the page
                for info in page.get_image_info():
                    if info.get("xref") == xref:
                        bbox = info.get("bbox")
                        image_blocks.append({
                            "id": f"img_{page_num}_{img_idx}",
                            "type": "image",
                            "x": bbox[0],
                            "y": bbox[1],
                            "width": bbox[2] - bbox[0],
                            "height": bbox[3] - bbox[1],
                            "page": page_num + 1
                        })
            
            pages_data.append({
                "page": page_num + 1,
                "width": page.rect.width,
                "height": page.rect.height,
                "text_blocks": text_blocks,
                "image_blocks": image_blocks
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
            try:
                page_num = int(edit.get('page', 1)) - 1
                if page_num < 0 or page_num >= len(pdf):
                    continue
                
                page = pdf[page_num]
                edit_type = edit.get('type', 'add')
                
                if edit_type == 'text':
                    x = float(edit.get('x', 100))
                    y = float(edit.get('y', 100))
                    content = edit.get('content', '')
                    font_size = float(edit.get('fontSize', 14))
                    color = edit.get('color', '#000000')
                    
                    if isinstance(color, str):
                        color = hex_to_rgb(color)
                    elif isinstance(color, list):
                        color = tuple(c if c <= 1 else c/255 for c in color)
                    
                    if content:
                        text_point = fitz.Point(x, y + font_size)
                        if has_hindi(content) and os.path.exists(UNICODE_FONT_PATH):
                             page.insert_text(text_point, content, fontsize=font_size,
                                           fontfile=UNICODE_FONT_PATH, color=color)
                        else:
                             page.insert_text(text_point, content, fontsize=font_size,
                                           fontname="helv", color=color)
                
                elif edit_type in ('image', 'signature'):
                    x = float(edit.get('x', 100))
                    y = float(edit.get('y', 100))
                    width = float(edit.get('width', 150))
                    height = float(edit.get('height', 100))
                    data = edit.get('data', '')
                    
                    if data and data.startswith('data:'):
                        base64_data = data.split(',')[1] if ',' in data else data
                        img_bytes = base64.b64decode(base64_data)
                        
                        img_rect = fitz.Rect(x, y, x + width, y + height)
                        page.insert_image(img_rect, stream=img_bytes)
                
                elif edit_type == 'whiteout':
                    x = float(edit.get('x', 0))
                    y = float(edit.get('y', 0))
                    width = float(edit.get('width', 100))
                    height = float(edit.get('height', 20))
                    
                    rect = fitz.Rect(x, y, x + width, y + height)
                    page.draw_rect(rect, color=(1, 1, 1), fill=(1, 1, 1))
                
                elif edit_type == 'shape':
                    x = float(edit.get('x', 0))
                    y = float(edit.get('y', 0))
                    width = float(edit.get('width', 100))
                    height = float(edit.get('height', 100))
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
                    fitz_rect = fitz.Rect(float(rect[0]), float(rect[1]), float(rect[0]) + float(rect[2]), float(rect[1]) + float(rect[3]))
                    
                    page.add_redact_annot(fitz_rect, fill=(1, 1, 1))
                    page.apply_redactions()
                    
                    new_text = edit.get('new_text', '')
                    font_size = float(edit.get('font_size', 12))
                    font_name = edit.get('font_name', 'helv')
                    color = edit.get('color', '#000000')
                    
                    if isinstance(color, str):
                        color = hex_to_rgb(color)
                    elif isinstance(color, list):
                        color = tuple(c if c <= 1 else c/255 for c in color)
                    
                    if new_text:
                        text_point = fitz.Point(float(rect[0]), float(rect[1]) + font_size)
                        if has_hindi(new_text) and os.path.exists(UNICODE_FONT_PATH):
                            page.insert_text(text_point, new_text, fontsize=font_size, 
                                           fontfile=UNICODE_FONT_PATH, color=color)
                        else:
                            page.insert_text(text_point, new_text, fontsize=font_size, 
                                           fontname=font_name, color=color)
                
                elif edit_type == 'add':
                    x = float(edit.get('x', 100))
                    y = float(edit.get('y', 100))
                    text = edit.get('text', '')
                    font_size = float(edit.get('font_size', 12))
                    color = edit.get('color', '#000000')
                    
                    if isinstance(color, str):
                        color = hex_to_rgb(color)
                    elif isinstance(color, list):
                        color = tuple(c if c <= 1 else c/255 for c in color)
                    
                    if text:
                        text_point = fitz.Point(x, y + font_size)
                        if has_hindi(text) and os.path.exists(UNICODE_FONT_PATH):
                            page.insert_text(text_point, text, fontsize=font_size,
                                           fontfile=UNICODE_FONT_PATH, color=color)
                        else:
                            page.insert_text(text_point, text, fontsize=font_size,
                                           fontname="helv", color=color)
                
                elif edit_type == 'delete':
                    rect = edit.get('rect', [0, 0, 100, 20])
                    fitz_rect = fitz.Rect(float(rect[0]), float(rect[1]), float(rect[0]) + float(rect[2]), float(rect[1]) + float(rect[3]))
                    page.add_redact_annot(fitz_rect, fill=(1, 1, 1))
                    page.apply_redactions()

            except Exception as inner_e:
                print(f"Error applying edit {edit}: {inner_e}")
                continue
        
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
