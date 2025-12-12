import fitz
import pytesseract
from PIL import Image
import io
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def ocr_pdf(input_path, output_path, language='eng'):
    try:
        pdf = fitz.open(input_path)
        
        output_pdf = SimpleDocTemplate(output_path, pagesize=letter,
                                       rightMargin=72, leftMargin=72,
                                       topMargin=72, bottomMargin=72)
        
        styles = getSampleStyleSheet()
        text_style = ParagraphStyle(
            'OCRText',
            parent=styles['Normal'],
            fontSize=11,
            leading=14,
            spaceAfter=6
        )
        
        story = []
        
        for page_num in range(len(pdf)):
            page = pdf[page_num]
            
            zoom = 2
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat)
            
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            
            text = pytesseract.image_to_string(img, lang=language)
            
            story.append(Paragraph(f"Page {page_num + 1}", styles['Heading3']))
            story.append(Spacer(1, 12))
            
            for line in text.split('\n'):
                if line.strip():
                    safe_line = line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                    story.append(Paragraph(safe_line, text_style))
            
            if page_num < len(pdf) - 1:
                story.append(PageBreak())
        
        pdf.close()
        
        if story:
            output_pdf.build(story)
        else:
            output_pdf.build([Paragraph("No text found via OCR", styles['Normal'])])
        
        return {'success': True, 'output_path': output_path, 'filename': output_path.split('/')[-1]}
    except Exception as e:
        return {'success': False, 'error': str(e)}
