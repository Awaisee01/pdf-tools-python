import fitz
from PIL import Image
import io
import os

def compress_pdf(input_path, output_path, quality='medium'):
    """
    Advanced PDF compression using dynamic techniques similar to iLovePDF.
    
    Compression techniques used:
    1. Image resolution reduction (downsampling)
    2. Image recompression with optimized JPEG quality
    3. Metadata removal
    4. Object/stream optimization
    5. Garbage collection for unused objects
    6. Stream deflation
    
    Quality levels:
    - 'extreme': Maximum compression, noticeable quality reduction (good for web/email)
    - 'recommended': Balanced compression, minimal quality loss (default)
    - 'less': Light compression, best quality preservation (for printing)
    """
    try:
        pdf = fitz.open(input_path)
        
        quality_settings = {
            'extreme': {
                'image_quality': 35,
                'max_image_width': 1200,
                'max_image_height': 1200,
                'garbage': 4,
                'deflate': True,
                'deflate_images': True,
                'deflate_fonts': True,
                'clean': True,
                'pretty': False,
                'linear': False,
            },
            'medium': {
                'image_quality': 60,
                'max_image_width': 1800,
                'max_image_height': 1800,
                'garbage': 4,
                'deflate': True,
                'deflate_images': True,
                'deflate_fonts': True,
                'clean': True,
                'pretty': False,
                'linear': False,
            },
            'less': {
                'image_quality': 85,
                'max_image_width': 2400,
                'max_image_height': 2400,
                'garbage': 3,
                'deflate': True,
                'deflate_images': True,
                'deflate_fonts': True,
                'clean': True,
                'pretty': False,
                'linear': False,
            }
        }
        
        settings = quality_settings.get(quality, quality_settings['medium'])
        
        images_compressed = 0
        images_downscaled = 0
        
        for page_num in range(len(pdf)):
            page = pdf[page_num]
            images = page.get_images(full=True)
            
            for img_index, img in enumerate(images):
                try:
                    xref = img[0]
                    base_image = pdf.extract_image(xref)
                    
                    if not base_image:
                        continue
                    
                    image_bytes = base_image.get("image")
                    if not image_bytes:
                        continue
                    
                    original_size = len(image_bytes)
                    
                    image = Image.open(io.BytesIO(image_bytes))
                    original_width, original_height = image.size
                    
                    needs_resize = False
                    new_width, new_height = original_width, original_height
                    
                    if original_width > settings['max_image_width'] or original_height > settings['max_image_height']:
                        ratio = min(
                            settings['max_image_width'] / original_width,
                            settings['max_image_height'] / original_height
                        )
                        new_width = int(original_width * ratio)
                        new_height = int(original_height * ratio)
                        needs_resize = True
                    
                    if needs_resize:
                        image = image.resize((new_width, new_height), Image.LANCZOS)
                        images_downscaled += 1
                    
                    if image.mode in ('RGBA', 'P', 'LA'):
                        background = Image.new('RGB', image.size, (255, 255, 255))
                        if image.mode == 'P':
                            image = image.convert('RGBA')
                        if image.mode in ('RGBA', 'LA'):
                            background.paste(image, mask=image.split()[-1])
                            image = background
                        else:
                            image = image.convert('RGB')
                    elif image.mode != 'RGB':
                        image = image.convert('RGB')
                    
                    output_buffer = io.BytesIO()
                    image.save(
                        output_buffer, 
                        format='JPEG', 
                        quality=settings['image_quality'], 
                        optimize=True,
                        progressive=True
                    )
                    
                    compressed_data = output_buffer.getvalue()
                    
                    if len(compressed_data) < original_size:
                        pdf.update_stream(xref, compressed_data)
                        images_compressed += 1
                        
                except Exception as e:
                    continue
        
        pdf.set_metadata({})
        
        pdf.save(
            output_path,
            garbage=settings['garbage'],
            deflate=settings['deflate'],
            deflate_images=settings['deflate_images'],
            deflate_fonts=settings['deflate_fonts'],
            clean=settings['clean'],
            pretty=settings['pretty'],
            linear=settings['linear']
        )
        pdf.close()
        
        original_size = os.path.getsize(input_path)
        new_size = os.path.getsize(output_path)
        reduction = ((original_size - new_size) / original_size) * 100 if original_size > 0 else 0
        
        if new_size >= original_size:
            import shutil
            shutil.copy(input_path, output_path)
            new_size = original_size
            reduction = 0
        
        return {
            'success': True, 
            'output_path': output_path, 
            'filename': output_path.split('/')[-1],
            'original_size': original_size,
            'new_size': new_size,
            'reduction': round(reduction, 1),
            'images_compressed': images_compressed,
            'images_downscaled': images_downscaled
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}
