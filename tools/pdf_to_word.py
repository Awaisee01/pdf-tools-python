import fitz
import os
from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH

def pdf_to_word(input_path, output_path):
    try:
        pdf = fitz.open(input_path)
        doc = Document()
        
        for page_num in range(len(pdf)):
            page = pdf[page_num]
            text = page.get_text("text")
            
            if text.strip():
                for line in text.split('\n'):
                    if line.strip():
                        para = doc.add_paragraph(line)
            
            if page_num < len(pdf) - 1:
                doc.add_page_break()
        
        doc.save(output_path)
        pdf.close()
        
        return {'success': True, 'output_path': output_path, 'filename': os.path.basename(output_path)}
    except Exception as e:
        return {'success': False, 'error': str(e)}
