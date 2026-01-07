import fitz
import os

def remove_pages(input_path, output_path, pages):
    try:
        pdf = fitz.open(input_path)
        total_pages = len(pdf)
        
        pages_to_remove = set()
        for p in pages.split(','):
            p = p.strip()
            if '-' in p:
                start, end = map(int, p.split('-'))
                pages_to_remove.update(range(start-1, end))
            else:
                pages_to_remove.add(int(p) - 1)
        
        pages_to_remove = sorted([p for p in pages_to_remove if 0 <= p < total_pages], reverse=True)
        
        for page_num in pages_to_remove:
            pdf.delete_page(page_num)
        
        if len(pdf) == 0:
            return {'success': False, 'error': 'Cannot remove all pages from PDF'}
        
        pdf.save(output_path)
        pdf.close()
        
        return {'success': True, 'output_path': output_path, 'filename': os.path.basename(output_path)}
    except Exception as e:
        return {'success': False, 'error': str(e)}
