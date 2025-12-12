import fitz

def protect_pdf(input_path, output_path, password):
    try:
        if not password:
            return {'success': False, 'error': 'Password is required'}
        
        pdf = fitz.open(input_path)
        
        perm = fitz.PDF_PERM_ACCESSIBILITY
        
        pdf.save(output_path, 
                encryption=fitz.PDF_ENCRYPT_AES_256,
                user_pw=password,
                owner_pw=password,
                permissions=perm)
        pdf.close()
        
        return {'success': True, 'output_path': output_path, 'filename': output_path.split('/')[-1]}
    except Exception as e:
        return {'success': False, 'error': str(e)}
