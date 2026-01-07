import fitz
import os

def crop_pdf(input_path, output_path, margins, pages='all', current_page=1):
    try:
        pdf = fitz.open(input_path)
        total_pages = len(pdf)
        
        if pages == 'current':
            pages_to_crop = [current_page - 1]
        else:
            pages_to_crop = list(range(total_pages))
        
        for page_num in pages_to_crop:
            if 0 <= page_num < total_pages:
                page = pdf[page_num]
                rect = page.rect
                new_rect = fitz.Rect(
                    rect.x0 + margins['left'],
                    rect.y0 + margins['top'],
                    rect.x1 - margins['right'],
                    rect.y1 - margins['bottom']
                )
                if new_rect.width > 0 and new_rect.height > 0:
                    page.set_cropbox(new_rect)
        
        pdf.save(output_path)
        pdf.close()
        
        return {'success': True, 'output_path': output_path, 'filename': os.path.basename(output_path)}
    except Exception as e:
        return {'success': False, 'error': str(e)}
