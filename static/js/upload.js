document.addEventListener('DOMContentLoaded', function() {
    const dropzone = document.getElementById('dropzone') || document.querySelector('.upload-zone');
    const fileInput = document.getElementById('fileInput');
    const addMoreInput = document.getElementById('addMoreInput');
    const browseBtn = document.getElementById('browseBtn');
    const thumbnailGrid = document.getElementById('thumbnailGrid');
    const thumbnailsContainer = document.getElementById('thumbnailsContainer');
    const addMoreBtn = document.getElementById('addMoreBtn');
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
    let draggedItem = null;

    if (browseBtn) {
        browseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (fileInput) fileInput.click();
        });
    }

    if (addMoreBtn) {
        addMoreBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (addMoreInput) addMoreInput.click();
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
            this.value = '';
        });
    }

    if (addMoreInput) {
        addMoreInput.addEventListener('change', function() {
            addMoreFiles(this.files);
            this.value = '';
        });
    }

    function handleFiles(newFiles) {
        files = Array.from(newFiles);
        updateThumbnailView();
    }

    function addMoreFiles(newFiles) {
        files = files.concat(Array.from(newFiles));
        updateThumbnailView();
    }

    function updateThumbnailView() {
        if (!thumbnailGrid || !thumbnailsContainer) return;
        
        if (files.length === 0) {
            thumbnailGrid.style.display = 'none';
            if (dropzone) dropzone.style.display = 'block';
            return;
        }

        if (dropzone) dropzone.style.display = 'none';
        thumbnailGrid.style.display = 'flex';
        thumbnailsContainer.innerHTML = '';

        files.forEach((file, index) => {
            const thumb = createThumbnail(file, index);
            thumbnailsContainer.appendChild(thumb);
        });

        setupDragAndDrop();
    }

    function createThumbnail(file, index) {
        const thumb = document.createElement('div');
        thumb.className = 'thumbnail-item';
        thumb.draggable = true;
        thumb.dataset.index = index;

        const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const isImage = file.type.startsWith('image/');
        const isWord = file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc');
        const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
        const isPPT = file.name.toLowerCase().endsWith('.pptx') || file.name.toLowerCase().endsWith('.ppt');

        let previewHTML = '';
        
        if (isImage) {
            const url = URL.createObjectURL(file);
            previewHTML = `<img src="${url}" alt="${file.name}" class="thumbnail-preview">`;
        } else if (isPDF) {
            previewHTML = `
                <div class="thumbnail-icon pdf-icon">
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.5"/>
                        <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.5"/>
                        <text x="12" y="16" text-anchor="middle" font-size="6" fill="currentColor" font-weight="bold">PDF</text>
                    </svg>
                </div>`;
        } else if (isWord) {
            previewHTML = `
                <div class="thumbnail-icon word-icon">
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.5"/>
                        <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.5"/>
                        <text x="12" y="16" text-anchor="middle" font-size="5" fill="currentColor" font-weight="bold">DOC</text>
                    </svg>
                </div>`;
        } else if (isExcel) {
            previewHTML = `
                <div class="thumbnail-icon excel-icon">
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.5"/>
                        <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.5"/>
                        <text x="12" y="16" text-anchor="middle" font-size="5" fill="currentColor" font-weight="bold">XLS</text>
                    </svg>
                </div>`;
        } else if (isPPT) {
            previewHTML = `
                <div class="thumbnail-icon ppt-icon">
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.5"/>
                        <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.5"/>
                        <text x="12" y="16" text-anchor="middle" font-size="5" fill="currentColor" font-weight="bold">PPT</text>
                    </svg>
                </div>`;
        } else {
            previewHTML = `
                <div class="thumbnail-icon file-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                    </svg>
                </div>`;
        }

        const fileName = file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name;

        thumb.innerHTML = `
            <div class="thumbnail-content">
                ${previewHTML}
                <button type="button" class="thumbnail-remove" data-index="${index}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <span class="thumbnail-name" title="${file.name}">${fileName}</span>
        `;

        thumb.querySelector('.thumbnail-remove').addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const idx = parseInt(this.dataset.index);
            files.splice(idx, 1);
            updateThumbnailView();
        });

        return thumb;
    }

    function setupDragAndDrop() {
        const items = thumbnailsContainer.querySelectorAll('.thumbnail-item');
        
        items.forEach(item => {
            item.addEventListener('dragstart', function(e) {
                draggedItem = this;
                this.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('dragend', function() {
                this.classList.remove('dragging');
                draggedItem = null;
                thumbnailsContainer.querySelectorAll('.thumbnail-item').forEach(i => {
                    i.classList.remove('drag-over');
                });
            });

            item.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (this !== draggedItem) {
                    this.classList.add('drag-over');
                }
            });

            item.addEventListener('dragleave', function() {
                this.classList.remove('drag-over');
            });

            item.addEventListener('drop', function(e) {
                e.preventDefault();
                this.classList.remove('drag-over');
                
                if (draggedItem && this !== draggedItem) {
                    const fromIndex = parseInt(draggedItem.dataset.index);
                    const toIndex = parseInt(this.dataset.index);
                    const originalLength = files.length;
                    const wasLastItem = toIndex === originalLength - 1;
                    
                    const movedFile = files.splice(fromIndex, 1)[0];
                    
                    let insertIndex;
                    if (fromIndex < toIndex) {
                        if (wasLastItem) {
                            insertIndex = files.length;
                        } else if (toIndex === fromIndex + 1) {
                            insertIndex = toIndex;
                        } else {
                            insertIndex = toIndex - 1;
                        }
                    } else {
                        insertIndex = toIndex;
                    }
                    
                    files.splice(insertIndex, 0, movedFile);
                    updateThumbnailView();
                }
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
                if (input.name && input.name !== 'files' && input.name !== 'addFiles' && input.type !== 'file') {
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
        if (addMoreInput) addMoreInput.value = '';
        if (thumbnailGrid) thumbnailGrid.style.display = 'none';
        if (thumbnailsContainer) thumbnailsContainer.innerHTML = '';
        if (dropzone) dropzone.style.display = 'block';
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
