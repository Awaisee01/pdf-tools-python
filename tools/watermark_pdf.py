import fitz
import os

def watermark_pdf(input_path, output_path, watermark_text, opacity=0.3):
    try:
        pdf = fitz.open(input_path)
        
        for page in pdf:
            rect = page.rect
            center_x = rect.width / 2
            center_y = rect.height / 2
            
            font_size = min(rect.width, rect.height) / 10
            
            gray_value = 0.5 + (opacity * 0.3)
            text_color = (gray_value, gray_value, gray_value)
            
            text_width = len(watermark_text) * font_size * 0.5
            text_x = center_x - text_width / 2
            text_y = center_y + font_size / 2
            
            text_point = fitz.Point(text_x, text_y)
            morph = (text_point, fitz.Matrix(1, 0, 0, 1, 0, 0).prerotate(-45))
            
            page.insert_text(
                text_point,
                watermark_text,
                fontsize=font_size,
                fontname="helv",
                color=text_color,
                overlay=True,
                morph=morph
            )
        
        pdf.save(output_path)
        pdf.close()
        
        return {'success': True, 'output_path': output_path, 'filename': os.path.basename(output_path)}
    except Exception as e:
        return {'success': False, 'error': str(e)}
