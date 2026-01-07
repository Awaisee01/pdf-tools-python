import fitz
import os

def unlock_pdf(input_path, output_path, password=''):
    try:
        pdf = fitz.open(input_path)
        
        if pdf.is_encrypted:
            if not pdf.authenticate(password):
                return {'success': False, 'error': 'Incorrect password'}
        
        new_pdf = fitz.open()
        new_pdf.insert_pdf(pdf)
        new_pdf.save(output_path)
        new_pdf.close()
        pdf.close()
        
        return {'success': True, 'output_path': output_path, 'filename': os.path.basename(output_path)}
    except Exception as e:
        return {'success': False, 'error': str(e)}
