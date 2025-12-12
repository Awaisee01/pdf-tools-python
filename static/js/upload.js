document.addEventListener('DOMContentLoaded', function() {
    const dropzone = document.getElementById('dropzone') || document.querySelector('.upload-zone');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const fileList = document.getElementById('fileList');
    const selectedFiles = document.getElementById('selectedFiles');
    const uploadForm = document.getElementById('uploadForm');
    const processBtn = document.getElementById('processBtn');
    const resultArea = document.getElementById('resultArea');
    const errorArea = document.getElementById('errorArea');
    const downloadButtons = document.getElementById('downloadButtons');
    const resultMessage = document.getElementById('resultMessage');
    const errorMessage = document.getElementById('errorMessage');
    const processAnother = document.getElementById('processAnother');
    const tryAgain = document.getElementById('tryAgain');
    const toolColumns = document.querySelector('.tool-columns');
    
    let files = [];

    if (browseBtn) {
        browseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (fileInput) fileInput.click();
        });
    }

    if (dropzone) {
        dropzone.addEventListener('click', function(e) {
            if (e.target !== browseBtn && !browseBtn.contains(e.target)) {
                if (fileInput) fileInput.click();
            }
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
    }

    if (fileInput) {
        fileInput.addEventListener('change', function() {
            handleFiles(this.files);
        });
    }

    function handleFiles(newFiles) {
        files = Array.from(newFiles);
        updateFileList();
    }

    function updateFileList() {
        if (!fileList || !selectedFiles) return;
        
        if (files.length === 0) {
            fileList.style.display = 'none';
            return;
        }

        fileList.style.display = 'block';
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
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const index = parseInt(this.dataset.index);
                files.splice(index, 1);
                updateFileList();
            });
        });
    }

    if (uploadForm) {
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
                    if (input.type === 'radio') {
                        if (input.checked) {
                            formData.append(input.name, input.value);
                        }
                    } else {
                        formData.append(input.name, input.value);
                    }
                }
            });

            const btnText = processBtn ? processBtn.querySelector('.btn-text') : null;
            const btnLoading = processBtn ? processBtn.querySelector('.btn-loading') : null;
            
            if (btnText) btnText.style.display = 'none';
            if (btnLoading) btnLoading.style.display = 'inline-flex';
            if (processBtn) processBtn.disabled = true;

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
                if (btnText) btnText.style.display = 'inline';
                if (btnLoading) btnLoading.style.display = 'none';
                if (processBtn) processBtn.disabled = false;
            }
        });
    }

    function showResult(result) {
        if (toolColumns) toolColumns.style.display = 'none';
        if (errorArea) errorArea.style.display = 'none';
        if (resultArea) resultArea.style.display = 'block';

        if (downloadButtons) downloadButtons.innerHTML = '';

        if (result.is_folder) {
            if (resultMessage) resultMessage.textContent = `Successfully processed! ${result.files ? result.files.length : ''} files created.`;
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
            if (downloadButtons) downloadButtons.appendChild(downloadBtn);
        } else {
            let msg = 'Your file has been processed successfully.';
            if (result.reduction !== undefined) {
                msg = `File compressed by ${result.reduction}%! Original: ${formatFileSize(result.original_size)}, New: ${formatFileSize(result.new_size)}`;
            }
            if (resultMessage) resultMessage.textContent = msg;

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
            if (downloadButtons) downloadButtons.appendChild(downloadBtn);
        }
    }

    function showError(message) {
        if (toolColumns) toolColumns.style.display = 'none';
        if (resultArea) resultArea.style.display = 'none';
        if (errorArea) errorArea.style.display = 'block';
        if (errorMessage) errorMessage.textContent = message;
    }

    function resetForm() {
        files = [];
        if (fileInput) fileInput.value = '';
        updateFileList();
        if (toolColumns) toolColumns.style.display = 'grid';
        if (resultArea) resultArea.style.display = 'none';
        if (errorArea) errorArea.style.display = 'none';
    }

    if (processAnother) processAnother.addEventListener('click', resetForm);
    if (tryAgain) tryAgain.addEventListener('click', resetForm);

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
