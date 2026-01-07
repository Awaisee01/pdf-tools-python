import sys
import os
import shutil
# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app import app, BASE_TEMP_DIR, UPLOAD_FOLDER, PROCESSED_FOLDER
    print(f"Successfully imported app.")
    print(f"TEMP_DIR: {BASE_TEMP_DIR}")
    print(f"UPLOAD: {UPLOAD_FOLDER}")
    print(f"PROCESSED: {PROCESSED_FOLDER}")

    # Check writable
    test_file = os.path.join(UPLOAD_FOLDER, 'test.txt')
    with open(test_file, 'w') as f:
        f.write('test')
    os.remove(test_file)
    print("Temp dir is writable.")

    with app.test_client() as client:
        resp = client.get('/')
        print(f"Index status: {resp.status_code}")
        assert resp.status_code == 200

        resp = client.get('/download/test_missing.pdf')
        print(f"Download missing: {resp.status_code}")
        assert resp.status_code == 404

    print("Verification passed successfully.")
except Exception as e:
    print(f"Verification FAILED: {e}")
    sys.exit(1)
