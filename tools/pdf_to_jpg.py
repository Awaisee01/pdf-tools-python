import fitz
import os

def pdf_to_jpg(input_path, output_folder, dpi=150):
    try:
        pdf = fitz.open(input_path)
        output_files = []
        
        zoom = dpi / 72
        matrix = fitz.Matrix(zoom, zoom)
        
        for page_num in range(len(pdf)):
            page = pdf[page_num]
            pix = page.get_pixmap(matrix=matrix)
            output_path = os.path.join(output_folder, f'page_{page_num + 1}.jpg')
            pix.save(output_path)
            output_files.append(output_path)
        
        pdf.close()
        folder_id = output_folder.split('/')[-1]
        return {'success': True, 'output_folder': folder_id, 'files': output_files, 'is_folder': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}
