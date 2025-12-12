import fitz

def crop_pdf(input_path, output_path, margins):
    try:
        pdf = fitz.open(input_path)
        
        for page in pdf:
            rect = page.rect
            new_rect = fitz.Rect(
                rect.x0 + margins['left'],
                rect.y0 + margins['top'],
                rect.x1 - margins['right'],
                rect.y1 - margins['bottom']
            )
            page.set_cropbox(new_rect)
        
        pdf.save(output_path)
        pdf.close()
        
        return {'success': True, 'output_path': output_path, 'filename': output_path.split('/')[-1]}
    except Exception as e:
        return {'success': False, 'error': str(e)}
