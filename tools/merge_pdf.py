import fitz

def merge_pdfs(input_files, output_path):
    try:
        result = fitz.open()
        for pdf_path in input_files:
            pdf = fitz.open(pdf_path)
            result.insert_pdf(pdf)
            pdf.close()
        result.save(output_path)
        result.close()
        return {'success': True, 'output_path': output_path, 'filename': output_path.split('/')[-1]}
    except Exception as e:
        return {'success': False, 'error': str(e)}
