import fitz
import os

def extract_text(input_path, output_folder):
    try:
        pdf = fitz.open(input_path)
        text_content = []
        
        for page_num in range(len(pdf)):
            page = pdf[page_num]
            text = page.get_text("text")
            text_content.append(f"--- Page {page_num + 1} ---\n{text}\n")
        
        output_path = os.path.join(output_folder, 'extracted_text.txt')
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(text_content))
        
        pdf.close()
        folder_id = output_folder.split('/')[-1]
        return {'success': True, 'output_folder': folder_id, 'files': [output_path], 'is_folder': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def extract_images(input_path, output_folder):
    try:
        pdf = fitz.open(input_path)
        output_files = []
        image_count = 0
        
        for page_num in range(len(pdf)):
            page = pdf[page_num]
            images = page.get_images()
            
            for img_index, img in enumerate(images):
                xref = img[0]
                base_image = pdf.extract_image(xref)
                
                if base_image:
                    image_bytes = base_image["image"]
                    image_ext = base_image["ext"]
                    image_count += 1
                    
                    output_path = os.path.join(output_folder, f'image_{image_count}.{image_ext}')
                    with open(output_path, 'wb') as f:
                        f.write(image_bytes)
                    output_files.append(output_path)
        
        pdf.close()
        
        if not output_files:
            return {'success': False, 'error': 'No images found in PDF'}
        
        folder_id = output_folder.split('/')[-1]
        return {'success': True, 'output_folder': folder_id, 'files': output_files, 'is_folder': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}
