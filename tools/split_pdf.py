import fitz
import os

def split_pdf(input_path, output_folder, split_type='all', pages=''):
    try:
        pdf = fitz.open(input_path)
        total_pages = len(pdf)
        output_files = []
        
        if split_type == 'all':
            for i in range(total_pages):
                output_pdf = fitz.open()
                output_pdf.insert_pdf(pdf, from_page=i, to_page=i)
                output_path = os.path.join(output_folder, f'page_{i+1}.pdf')
                output_pdf.save(output_path)
                output_pdf.close()
                output_files.append(output_path)
        
        elif split_type == 'range' and pages:
            ranges = pages.split(',')
            for idx, range_str in enumerate(ranges):
                range_str = range_str.strip()
                if '-' in range_str:
                    start, end = map(int, range_str.split('-'))
                    start = max(1, min(start, total_pages)) - 1
                    end = max(1, min(end, total_pages)) - 1
                else:
                    start = end = int(range_str) - 1
                    start = max(0, min(start, total_pages - 1))
                    end = start
                
                output_pdf = fitz.open()
                output_pdf.insert_pdf(pdf, from_page=start, to_page=end)
                output_path = os.path.join(output_folder, f'pages_{start+1}-{end+1}.pdf')
                output_pdf.save(output_path)
                output_pdf.close()
                output_files.append(output_path)
        
        pdf.close()
        folder_id = output_folder.split('/')[-1]
        return {'success': True, 'output_folder': folder_id, 'files': output_files, 'is_folder': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}
