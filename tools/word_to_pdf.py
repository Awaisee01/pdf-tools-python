from docx import Document
import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

def word_to_pdf(input_path, output_path):
    try:
        doc = Document(input_path)
        
        pdf = SimpleDocTemplate(output_path, pagesize=letter,
                               rightMargin=72, leftMargin=72,
                               topMargin=72, bottomMargin=72)
        
        styles = getSampleStyleSheet()
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=11,
            leading=14,
            spaceAfter=6
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading1'],
            fontSize=14,
            leading=18,
            spaceAfter=12,
            spaceBefore=12
        )
        
        story = []
        
        for para in doc.paragraphs:
            text = para.text.strip()
            if text:
                text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                
                if para.style.name.startswith('Heading'):
                    story.append(Paragraph(text, heading_style))
                else:
                    story.append(Paragraph(text, normal_style))
                story.append(Spacer(1, 6))
        
        if story:
            pdf.build(story)
        else:
            pdf.build([Paragraph("Empty document", normal_style)])
        
        return {'success': True, 'output_path': output_path, 'filename': os.path.basename(output_path)}
    except Exception as e:
        return {'success': False, 'error': str(e)}
