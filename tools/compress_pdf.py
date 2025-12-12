import fitz

def compress_pdf(input_path, output_path, quality='medium'):
    try:
        pdf = fitz.open(input_path)
        
        quality_settings = {
            'low': {'image_quality': 30, 'garbage': 4, 'deflate': True},
            'medium': {'image_quality': 50, 'garbage': 3, 'deflate': True},
            'high': {'image_quality': 75, 'garbage': 2, 'deflate': True}
        }
        
        settings = quality_settings.get(quality, quality_settings['medium'])
        
        for page_num in range(len(pdf)):
            page = pdf[page_num]
            images = page.get_images()
            
            for img_index, img in enumerate(images):
                try:
                    xref = img[0]
                    base_image = pdf.extract_image(xref)
                    if base_image:
                        from PIL import Image
                        import io
                        
                        image_bytes = base_image["image"]
                        image = Image.open(io.BytesIO(image_bytes))
                        
                        if image.mode in ('RGBA', 'P'):
                            image = image.convert('RGB')
                        
                        output_buffer = io.BytesIO()
                        image.save(output_buffer, format='JPEG', quality=settings['image_quality'], optimize=True)
                        
                        pdf.update_stream(xref, output_buffer.getvalue())
                except Exception:
                    continue
        
        pdf.save(output_path, garbage=settings['garbage'], deflate=settings['deflate'])
        pdf.close()
        
        import os
        original_size = os.path.getsize(input_path)
        new_size = os.path.getsize(output_path)
        reduction = ((original_size - new_size) / original_size) * 100 if original_size > 0 else 0
        
        return {
            'success': True, 
            'output_path': output_path, 
            'filename': output_path.split('/')[-1],
            'original_size': original_size,
            'new_size': new_size,
            'reduction': round(reduction, 1)
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}
