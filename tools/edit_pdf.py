import fitz

def edit_pdf(input_path, output_path, text_content, position):
    try:
        pdf = fitz.open(input_path)
        
        page_num = position.get('page', 1) - 1
        if page_num < 0 or page_num >= len(pdf):
            page_num = 0
        
        page = pdf[page_num]
        
        x = position.get('x', 100)
        y = position.get('y', 100)
        
        if text_content:
            font_size = 12
            text_rect = fitz.Rect(x, y, x + 400, y + 200)
            page.insert_textbox(text_rect, text_content, fontsize=font_size,
                              fontname="helv", color=(0, 0, 0))
        
        pdf.save(output_path)
        pdf.close()
        
        return {'success': True, 'output_path': output_path, 'filename': output_path.split('/')[-1]}
    except Exception as e:
        return {'success': False, 'error': str(e)}
