import fitz

def rotate_pdf(input_path, output_path, angle=90, pages='all'):
    try:
        pdf = fitz.open(input_path)
        total_pages = len(pdf)
        
        if pages == 'all':
            page_list = list(range(total_pages))
        else:
            page_list = []
            for p in pages.split(','):
                p = p.strip()
                if '-' in p:
                    start, end = map(int, p.split('-'))
                    page_list.extend(range(start-1, end))
                else:
                    page_list.append(int(p) - 1)
        
        for page_num in page_list:
            if 0 <= page_num < total_pages:
                page = pdf[page_num]
                page.set_rotation(page.rotation + angle)
        
        pdf.save(output_path)
        pdf.close()
        
        return {'success': True, 'output_path': output_path, 'filename': output_path.split('/')[-1]}
    except Exception as e:
        return {'success': False, 'error': str(e)}
