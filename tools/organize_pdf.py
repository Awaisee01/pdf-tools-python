import fitz
import os

def organize_pdf(input_path, output_path, order):
    try:
        pdf = fitz.open(input_path)
        total_pages = len(pdf)
        
        if not order:
            return {'success': False, 'error': 'No page order specified'}
        
        new_pdf = fitz.open()
        
        for p in order.split(','):
            p = p.strip()
            if p == 'blank':
                page_rect = pdf[0].rect if total_pages > 0 else fitz.Rect(0, 0, 595, 842)
                new_pdf.new_page(width=page_rect.width, height=page_rect.height)
            else:
                try:
                    page_num = int(p) - 1
                    if 0 <= page_num < total_pages:
                        new_pdf.insert_pdf(pdf, from_page=page_num, to_page=page_num)
                except ValueError:
                    continue
        
        if len(new_pdf) == 0:
            return {'success': False, 'error': 'No valid pages to organize'}
        
        new_pdf.save(output_path)
        new_pdf.close()
        pdf.close()
        
        return {'success': True, 'output_path': output_path, 'filename': os.path.basename(output_path)}
    except Exception as e:
        return {'success': False, 'error': str(e)}
