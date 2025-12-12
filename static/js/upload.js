document.addEventListener('DOMContentLoaded', function() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const fileList = document.getElementById('fileList');
    const selectedFiles = document.getElementById('selectedFiles');
    const toolOptions = document.getElementById('toolOptions');
    const uploadForm = document.getElementById('uploadForm');
    const processBtn = document.getElementById('processBtn');
    const uploadArea = document.getElementById('uploadArea');
    const resultArea = document.getElementById('resultArea');
    const errorArea = document.getElementById('errorArea');
    const downloadButtons = document.getElementById('downloadButtons');
    const resultMessage = document.getElementById('resultMessage');
    const errorMessage = document.getElementById('errorMessage');
    const processAnother = document.getElementById('processAnother');
    const tryAgain = document.getElementById('tryAgain');
    
    let files = [];

    browseBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        fileInput.click();
    });

    dropzone.addEventListener('click', function() {
        fileInput.click();
    });

    dropzone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', function() {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    function handleFiles(newFiles) {
        files = Array.from(newFiles);
        updateFileList();
    }

    function updateFileList() {
        if (files.length === 0) {
            fileList.style.display = 'none';
            toolOptions.style.display = 'none';
            return;
        }

        fileList.style.display = 'block';
        toolOptions.style.display = 'block';
        selectedFiles.innerHTML = '';

        files.forEach((file, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="file-name">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    ${file.name}
                </span>
                <span class="file-size">${formatFileSize(file.size)}</span>
                <button type="button" class="remove-file" data-index="${index}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            `;
            selectedFiles.appendChild(li);
        });

        document.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                files.splice(index, 1);
                updateFileList();
            });
        });
    }

    const splitType = document.getElementById('splitType');
    const pagesGroup = document.getElementById('pagesGroup');
    if (splitType && pagesGroup) {
        splitType.addEventListener('change', function() {
            pagesGroup.style.display = this.value === 'range' ? 'block' : 'none';
        });
    }

    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (files.length === 0) {
            alert('Please select at least one file');
            return;
        }

        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });

        const inputs = uploadForm.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.name && input.name !== 'files' && input.type !== 'file') {
                formData.append(input.name, input.value);
            }
        });

        const btnText = processBtn.querySelector('.btn-text');
        const btnLoading = processBtn.querySelector('.btn-loading');
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline-flex';
        processBtn.disabled = true;

        showLoading('Processing your file...');

        try {
            const response = await fetch(`/process/${toolName}`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            hideLoading();

            if (result.success) {
                showResult(result);
            } else {
                showError(result.error || 'Processing failed');
            }
        } catch (error) {
            hideLoading();
            showError('An error occurred while processing your file');
        } finally {
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            processBtn.disabled = false;
        }
    });

    function showResult(result) {
        uploadArea.style.display = 'none';
        errorArea.style.display = 'none';
        resultArea.style.display = 'block';

        downloadButtons.innerHTML = '';

        if (result.is_folder) {
            resultMessage.textContent = `Successfully processed! ${result.files ? result.files.length : ''} files created.`;
            const downloadBtn = document.createElement('a');
            downloadBtn.href = `/download-folder/${result.output_folder}`;
            downloadBtn.className = 'btn btn-download';
            downloadBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download All (ZIP)
            `;
            downloadButtons.appendChild(downloadBtn);
        } else {
            let msg = 'Your file has been processed successfully.';
            if (result.reduction !== undefined) {
                msg = `File compressed by ${result.reduction}%! Original: ${formatFileSize(result.original_size)}, New: ${formatFileSize(result.new_size)}`;
            }
            resultMessage.textContent = msg;

            const downloadBtn = document.createElement('a');
            downloadBtn.href = `/download/${result.filename}`;
            downloadBtn.className = 'btn btn-download';
            downloadBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download File
            `;
            downloadButtons.appendChild(downloadBtn);
        }
    }

    function showError(message) {
        uploadArea.style.display = 'none';
        resultArea.style.display = 'none';
        errorArea.style.display = 'block';
        errorMessage.textContent = message;
    }

    function resetForm() {
        files = [];
        fileInput.value = '';
        updateFileList();
        uploadArea.style.display = 'block';
        resultArea.style.display = 'none';
        errorArea.style.display = 'none';
    }

    processAnother.addEventListener('click', resetForm);
    tryAgain.addEventListener('click', resetForm);

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function showLoading(message) {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.id = 'loadingOverlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p>${message}</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    function hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.remove();
        }
    }
});
