import fitz

def watermark_pdf(input_path, output_path, watermark_text, opacity=0.3):
    try:
        pdf = fitz.open(input_path)
        
        for page in pdf:
            rect = page.rect
            center_x = rect.width / 2
            center_y = rect.height / 2
            
            font_size = min(rect.width, rect.height) / 8
            
            text_color = (0.7, 0.7, 0.7)
            
            page.insert_text(
                (center_x - len(watermark_text) * font_size / 4, center_y),
                watermark_text,
                fontsize=font_size,
                fontname="helv",
                color=text_color,
                rotate=45,
                overlay=True
            )
        
        pdf.save(output_path)
        pdf.close()
        
        return {'success': True, 'output_path': output_path, 'filename': output_path.split('/')[-1]}
    except Exception as e:
        return {'success': False, 'error': str(e)}
