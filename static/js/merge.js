document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const dropzone = document.getElementById('dropzone');
    const initialUpload = document.getElementById('initialUpload');
    const mergeToolLayout = document.getElementById('mergeToolLayout');
    const mergeFilesGrid = document.getElementById('mergeFilesGrid');
    const addMoreFilesBtn = document.getElementById('addMoreFilesBtn');
    const addMoreInput = document.getElementById('addMoreInput');
    const sortFilesBtn = document.getElementById('sortFilesBtn');
    const mergeForm = document.getElementById('mergeForm');
    const mergeBtn = document.getElementById('mergeBtn');
    const fileCountText = document.getElementById('fileCountText');
    const resultArea = document.getElementById('resultArea');
    const errorArea = document.getElementById('errorArea');
    const downloadButtons = document.getElementById('downloadButtons');
    const processAnother = document.getElementById('processAnother');
    const tryAgain = document.getElementById('tryAgain');

    let uploadedFiles = [];
    let draggedItem = null;

    browseBtn.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('click', (e) => {
        if (e.target !== browseBtn) fileInput.click();
    });

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
        if (files.length > 0) {
            handleFiles(files);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFiles(Array.from(e.target.files));
        }
    });

    addMoreFilesBtn.addEventListener('click', () => addMoreInput.click());
    
    addMoreInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            addMoreFiles(Array.from(e.target.files));
        }
    });

    sortFilesBtn.addEventListener('click', sortFilesAlphabetically);

    async function handleFiles(files) {
        uploadedFiles = [];
        for (const file of files) {
            const thumbnail = await generateThumbnail(file);
            uploadedFiles.push({ file, thumbnail, name: file.name });
        }
        
        initialUpload.style.display = 'none';
        mergeToolLayout.style.display = 'grid';
        renderFileGrid();
    }

    async function addMoreFiles(files) {
        for (const file of files) {
            const thumbnail = await generateThumbnail(file);
            uploadedFiles.push({ file, thumbnail, name: file.name });
        }
        renderFileGrid();
        addMoreInput.value = '';
    }

    async function generateThumbnail(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(1);
            
            const scale = 0.5;
            const viewport = page.getViewport({ scale });
            
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport }).promise;
            
            return canvas.toDataURL('image/jpeg', 0.7);
        } catch (error) {
            console.error('Error generating thumbnail:', error);
            return null;
        }
    }

    function renderFileGrid() {
        mergeFilesGrid.innerHTML = '';
        
        uploadedFiles.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'merge-file-card';
            card.draggable = true;
            card.dataset.index = index;
            
            const thumbnail = document.createElement('div');
            thumbnail.className = 'merge-file-thumbnail';
            
            if (item.thumbnail) {
                const img = document.createElement('img');
                img.src = item.thumbnail;
                img.alt = item.name;
                thumbnail.appendChild(img);
            } else {
                thumbnail.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                `;
            }
            
            const fileName = document.createElement('div');
            fileName.className = 'merge-file-name';
            fileName.textContent = truncateFileName(item.name, 25);
            fileName.title = item.name;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'merge-file-remove';
            removeBtn.innerHTML = '&times;';
            removeBtn.title = 'Remove file';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeFile(index);
            });
            
            card.appendChild(thumbnail);
            card.appendChild(fileName);
            card.appendChild(removeBtn);
            
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragend', handleDragEnd);
            card.addEventListener('dragover', handleDragOver);
            card.addEventListener('drop', handleDrop);
            card.addEventListener('dragenter', handleDragEnter);
            card.addEventListener('dragleave', handleDragLeave);
            
            mergeFilesGrid.appendChild(card);
        });
        
        updateFileCount();
    }

    function truncateFileName(name, maxLength) {
        if (name.length <= maxLength) return name;
        const ext = name.slice(name.lastIndexOf('.'));
        const baseName = name.slice(0, name.lastIndexOf('.'));
        const truncatedBase = baseName.slice(0, maxLength - ext.length - 3);
        return truncatedBase + '...' + ext;
    }

    function removeFile(index) {
        uploadedFiles.splice(index, 1);
        if (uploadedFiles.length === 0) {
            resetTool();
        } else {
            renderFileGrid();
        }
    }

    function updateFileCount() {
        const count = uploadedFiles.length;
        fileCountText.textContent = `${count} file${count !== 1 ? 's' : ''} selected`;
    }

    function sortFilesAlphabetically() {
        uploadedFiles.sort((a, b) => a.name.localeCompare(b.name));
        renderFileGrid();
    }

    function handleDragStart(e) {
        draggedItem = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.dataset.index);
    }

    function handleDragEnd() {
        this.classList.remove('dragging');
        document.querySelectorAll('.merge-file-card').forEach(card => {
            card.classList.remove('drag-over');
        });
        draggedItem = null;
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    function handleDragEnter(e) {
        e.preventDefault();
        if (this !== draggedItem) {
            this.classList.add('drag-over');
        }
    }

    function handleDragLeave() {
        this.classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.preventDefault();
        this.classList.remove('drag-over');
        
        if (draggedItem === this) return;
        
        const fromIndex = parseInt(draggedItem.dataset.index);
        let toIndex = parseInt(this.dataset.index);
        
        const [movedItem] = uploadedFiles.splice(fromIndex, 1);
        
        if (fromIndex < toIndex) {
            toIndex--;
        }
        
        uploadedFiles.splice(toIndex, 0, movedItem);
        
        renderFileGrid();
    }

    mergeForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (uploadedFiles.length < 2) {
            alert('Please select at least 2 PDF files to merge');
            return;
        }

        const formData = new FormData();
        uploadedFiles.forEach((item, index) => {
            formData.append('files', item.file);
        });

        const originalText = mergeBtn.innerHTML;
        mergeBtn.innerHTML = '<svg class="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none"/></svg> Merging...';
        mergeBtn.disabled = true;

        try {
            const response = await fetch('/process/merge', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                mergeToolLayout.style.display = 'none';
                resultArea.style.display = 'block';

                downloadButtons.innerHTML = '';
                const btn = document.createElement('a');
                btn.href = `/download/${result.filename}`;
                btn.className = 'btn btn-download';
                btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download Merged PDF`;
                downloadButtons.appendChild(btn);
            } else {
                showError(result.error || 'Failed to merge PDFs');
            }
        } catch (error) {
            showError(error.message || 'An error occurred');
        } finally {
            mergeBtn.innerHTML = originalText;
            mergeBtn.disabled = false;
        }
    });

    function showError(message) {
        mergeToolLayout.style.display = 'none';
        errorArea.style.display = 'block';
        document.getElementById('errorMessage').textContent = message;
    }

    function resetTool() {
        uploadedFiles = [];
        mergeFilesGrid.innerHTML = '';
        
        mergeToolLayout.style.display = 'none';
        resultArea.style.display = 'none';
        errorArea.style.display = 'none';
        initialUpload.style.display = 'block';
        
        fileInput.value = '';
        addMoreInput.value = '';
    }

    processAnother.addEventListener('click', resetTool);
    tryAgain.addEventListener('click', resetTool);
});
