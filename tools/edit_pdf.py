import fitz
import json
import base64
from io import BytesIO

def extract_text_blocks(input_path):
    """Extract text blocks with their positions from a PDF."""
    try:
        pdf = fitz.open(input_path)
        pages_data = []
        
        for page_num in range(len(pdf)):
            page = pdf[page_num]
            page_dict = page.get_text("dict")
            
            text_blocks = []
            for block in page_dict.get("blocks", []):
                if block.get("type") == 0:
                    block_text = ""
                    font_size = 12
                    font_name = "helv"
                    
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            block_text += span.get("text", "")
                            font_size = span.get("size", 12)
                            font_name = span.get("font", "helv")
                        block_text += "\n"
                    
                    block_text = block_text.strip()
                    if block_text:
                        bbox = block.get("bbox", [0, 0, 100, 20])
                        text_blocks.append({
                            "id": f"block_{page_num}_{len(text_blocks)}",
                            "text": block_text,
                            "x": bbox[0],
                            "y": bbox[1],
                            "width": bbox[2] - bbox[0],
                            "height": bbox[3] - bbox[1],
                            "font_size": font_size,
                            "font_name": font_name,
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

def edit_pdf(input_path, output_path, edits):
    """
    Apply edits to a PDF.
    edits is a list of edit operations:
    - {"type": "modify", "page": 1, "original_rect": [x,y,w,h], "new_text": "...", "font_size": 12}
    - {"type": "add", "page": 1, "x": 100, "y": 100, "text": "...", "font_size": 12}
    - {"type": "delete", "page": 1, "rect": [x,y,w,h]}
    """
    try:
        pdf = fitz.open(input_path)
        
        for edit in edits:
            page_num = edit.get('page', 1) - 1
            if page_num < 0 or page_num >= len(pdf):
                continue
            
            page = pdf[page_num]
            edit_type = edit.get('type', 'add')
            
            if edit_type == 'modify':
                rect = edit.get('original_rect', [0, 0, 100, 20])
                fitz_rect = fitz.Rect(rect[0], rect[1], rect[0] + rect[2], rect[1] + rect[3])
                
                page.add_redact_annot(fitz_rect, fill=(1, 1, 1))
                page.apply_redactions()
                
                new_text = edit.get('new_text', '')
                font_size = edit.get('font_size', 12)
                
                if new_text:
                    text_point = fitz.Point(rect[0], rect[1] + font_size)
                    page.insert_text(text_point, new_text, fontsize=font_size, 
                                   fontname="helv", color=(0, 0, 0))
            
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
