import fitz

def organize_pdf(input_path, output_path, order):
    try:
        pdf = fitz.open(input_path)
        total_pages = len(pdf)
        
        if not order:
            return {'success': False, 'error': 'No page order specified'}
        
        new_order = []
        for p in order.split(','):
            p = p.strip()
            page_num = int(p) - 1
            if 0 <= page_num < total_pages:
                new_order.append(page_num)
        
        if not new_order:
            return {'success': False, 'error': 'Invalid page order'}
        
        new_pdf = fitz.open()
        for page_num in new_order:
            new_pdf.insert_pdf(pdf, from_page=page_num, to_page=page_num)
        
        new_pdf.save(output_path)
        new_pdf.close()
        pdf.close()
        
        return {'success': True, 'output_path': output_path, 'filename': output_path.split('/')[-1]}
    except Exception as e:
        return {'success': False, 'error': str(e)}
