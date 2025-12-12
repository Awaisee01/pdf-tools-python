document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const dropzone = document.getElementById('dropzone');
    const initialUpload = document.getElementById('initialUpload');
    const editToolLayout = document.getElementById('editToolLayout');
    const pageThumbnails = document.getElementById('pageThumbnails');
    const pdfCanvas = document.getElementById('pdfCanvas');
    const textBlocksOverlay = document.getElementById('textBlocksOverlay');
    const editForm = document.getElementById('editForm');
    const resultArea = document.getElementById('resultArea');
    const errorArea = document.getElementById('errorArea');
    const downloadButtons = document.getElementById('downloadButtons');
    const processAnother = document.getElementById('processAnother');
    const tryAgain = document.getElementById('tryAgain');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const selectTool = document.getElementById('selectTool');
    const addTextTool = document.getElementById('addTextTool');
    const textPropertiesPanel = document.getElementById('textPropertiesPanel');
    const undoBtn = document.getElementById('undoBtn');
    const editsCount = document.getElementById('editsCount');
    const textEditModal = document.getElementById('textEditModal');
    const closeTextModal = document.getElementById('closeTextModal');
    const textEditArea = document.getElementById('textEditArea');
    const modalFontSize = document.getElementById('modalFontSize');
    const cancelTextEdit = document.getElementById('cancelTextEdit');
    const applyTextEdit = document.getElementById('applyTextEdit');
    const colorBtns = document.querySelectorAll('.color-btn');

    let pdfDoc = null;
    let currentPage = 1;
    let totalPages = 0;
    let uploadedFile = null;
    let pdfScale = 1;
    let textBlocks = {};
    let edits = [];
    let currentTool = 'select';
    let selectedColor = '#000000';
    let currentEditingBlock = null;
    let pagesTextData = null;

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
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'application/pdf') {
            handleFile(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    async function handleFile(file) {
        uploadedFile = file;
        edits = [];
        updateEditsCount();
        
        const arrayBuffer = await file.arrayBuffer();
        pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        totalPages = pdfDoc.numPages;

        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch('/api/extract-text-blocks', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (result.success) {
                pagesTextData = result.pages;
            }
        } catch (error) {
            console.error('Failed to extract text blocks:', error);
        }

        initialUpload.style.display = 'none';
        editToolLayout.style.display = 'grid';

        await renderThumbnails();
        await renderPage(1);
        updatePageNavigation();
    }

    async function renderThumbnails() {
        pageThumbnails.innerHTML = '';
        for (let i = 1; i <= totalPages; i++) {
            const page = await pdfDoc.getPage(i);
            const scale = 0.2;
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport }).promise;

            const thumbWrapper = document.createElement('div');
            thumbWrapper.className = 'page-thumbnail' + (i === 1 ? ' active' : '');
            thumbWrapper.dataset.page = i;

            const pageNum = document.createElement('span');
            pageNum.className = 'page-num';
            pageNum.textContent = i;

            thumbWrapper.appendChild(canvas);
            thumbWrapper.appendChild(pageNum);
            thumbWrapper.addEventListener('click', async () => {
                currentPage = i;
                await renderPage(i);
                updatePageNavigation();
                document.querySelectorAll('.page-thumbnail').forEach(t => t.classList.remove('active'));
                thumbWrapper.classList.add('active');
            });
            pageThumbnails.appendChild(thumbWrapper);
        }
    }

    async function renderPage(pageNum) {
        const page = await pdfDoc.getPage(pageNum);
        const container = document.getElementById('pdfCanvasContainer');
        const maxWidth = container.clientWidth - 40 || 600;
        const maxHeight = container.clientHeight - 40 || window.innerHeight * 0.7;
        
        const viewport = page.getViewport({ scale: 1 });
        const scaleX = maxWidth > 0 ? maxWidth / viewport.width : 1;
        const scaleY = maxHeight > 0 ? maxHeight / viewport.height : 1;
        pdfScale = Math.min(scaleX, scaleY, 1.5);
        if (pdfScale <= 0.1) pdfScale = 1;
        
        const scaledViewport = page.getViewport({ scale: pdfScale });

        pdfCanvas.width = scaledViewport.width;
        pdfCanvas.height = scaledViewport.height;

        const ctx = pdfCanvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;

        renderTextBlocks(pageNum);
        renderAddedTexts();
    }

    function renderTextBlocks(pageNum) {
        textBlocksOverlay.innerHTML = '';
        textBlocksOverlay.style.width = pdfCanvas.width + 'px';
        textBlocksOverlay.style.height = pdfCanvas.height + 'px';

        if (!pagesTextData) return;
        
        const pageData = pagesTextData.find(p => p.page === pageNum);
        if (!pageData) return;

        pageData.text_blocks.forEach(block => {
            const blockEl = document.createElement('div');
            blockEl.className = 'text-block-overlay';
            blockEl.dataset.blockId = block.id;
            blockEl.style.left = (block.x * pdfScale) + 'px';
            blockEl.style.top = (block.y * pdfScale) + 'px';
            blockEl.style.width = (block.width * pdfScale) + 'px';
            blockEl.style.height = (block.height * pdfScale) + 'px';
            
            const editedVersion = edits.find(e => e.blockId === block.id && e.type === 'modify');
            if (editedVersion) {
                blockEl.classList.add('edited');
                blockEl.title = editedVersion.new_text || '[Deleted]';
            } else {
                blockEl.title = block.text;
            }

            blockEl.addEventListener('click', () => {
                if (currentTool === 'select') {
                    openTextEditModal(block, blockEl);
                }
            });

            textBlocksOverlay.appendChild(blockEl);
        });

        if (currentTool === 'addText') {
            textBlocksOverlay.style.cursor = 'crosshair';
        } else {
            textBlocksOverlay.style.cursor = 'default';
        }
    }

    function openTextEditModal(block, blockEl) {
        currentEditingBlock = block;
        
        const editedVersion = edits.find(e => e.blockId === block.id && e.type === 'modify');
        textEditArea.value = editedVersion ? editedVersion.new_text : block.text;
        modalFontSize.value = block.font_size || 12;
        
        textEditModal.style.display = 'flex';
        textEditArea.focus();
    }

    closeTextModal.addEventListener('click', () => {
        textEditModal.style.display = 'none';
        currentEditingBlock = null;
    });

    cancelTextEdit.addEventListener('click', () => {
        textEditModal.style.display = 'none';
        currentEditingBlock = null;
    });

    textEditModal.addEventListener('click', (e) => {
        if (e.target === textEditModal) {
            textEditModal.style.display = 'none';
            currentEditingBlock = null;
        }
    });

    applyTextEdit.addEventListener('click', () => {
        if (!currentEditingBlock) return;

        const newText = textEditArea.value;
        const fontSize = parseInt(modalFontSize.value) || 12;
        
        const existingEditIndex = edits.findIndex(e => e.blockId === currentEditingBlock.id);
        
        const editObj = {
            type: 'modify',
            blockId: currentEditingBlock.id,
            page: currentEditingBlock.page,
            original_rect: [
                currentEditingBlock.x,
                currentEditingBlock.y,
                currentEditingBlock.width,
                currentEditingBlock.height
            ],
            new_text: newText,
            font_size: fontSize
        };

        if (existingEditIndex >= 0) {
            edits[existingEditIndex] = editObj;
        } else {
            edits.push(editObj);
        }

        updateEditsCount();
        renderTextBlocks(currentPage);
        
        textEditModal.style.display = 'none';
        currentEditingBlock = null;
    });

    function updatePageNavigation() {
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        prevPageBtn.disabled = currentPage <= 1;
        nextPageBtn.disabled = currentPage >= totalPages;
    }

    prevPageBtn.addEventListener('click', async () => {
        if (currentPage > 1) {
            currentPage--;
            await renderPage(currentPage);
            updatePageNavigation();
            updateThumbnailActive();
        }
    });

    nextPageBtn.addEventListener('click', async () => {
        if (currentPage < totalPages) {
            currentPage++;
            await renderPage(currentPage);
            updatePageNavigation();
            updateThumbnailActive();
        }
    });

    function updateThumbnailActive() {
        document.querySelectorAll('.page-thumbnail').forEach(t => {
            t.classList.toggle('active', parseInt(t.dataset.page) === currentPage);
        });
    }

    selectTool.addEventListener('click', () => {
        currentTool = 'select';
        selectTool.classList.add('active');
        addTextTool.classList.remove('active');
        textBlocksOverlay.style.cursor = 'default';
    });

    addTextTool.addEventListener('click', () => {
        currentTool = 'addText';
        addTextTool.classList.add('active');
        selectTool.classList.remove('active');
        textBlocksOverlay.style.cursor = 'crosshair';
        textPropertiesPanel.style.display = 'block';
    });

    textBlocksOverlay.addEventListener('click', (e) => {
        if (currentTool === 'addText' && e.target === textBlocksOverlay) {
            const rect = textBlocksOverlay.getBoundingClientRect();
            const x = (e.clientX - rect.left) / pdfScale;
            const y = (e.clientY - rect.top) / pdfScale;
            
            const newText = prompt('Enter text to add:');
            if (newText) {
                const fontSize = parseInt(document.getElementById('fontSize').value) || 12;
                edits.push({
                    type: 'add',
                    page: currentPage,
                    x: x,
                    y: y,
                    text: newText,
                    font_size: fontSize,
                    color: hexToRgb(selectedColor)
                });
                updateEditsCount();
                renderAddedTexts();
            }
        }
    });

    function renderAddedTexts() {
        document.querySelectorAll('.added-text-overlay').forEach(el => el.remove());
        
        edits.filter(e => e.type === 'add' && e.page === currentPage).forEach((edit, index) => {
            const textEl = document.createElement('div');
            textEl.className = 'added-text-overlay';
            textEl.style.left = (edit.x * pdfScale) + 'px';
            textEl.style.top = (edit.y * pdfScale) + 'px';
            textEl.style.fontSize = (edit.font_size * pdfScale) + 'px';
            textEl.textContent = edit.text;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-added-text';
            removeBtn.innerHTML = '&times;';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const editIndex = edits.findIndex(ed => ed === edit);
                if (editIndex >= 0) {
                    edits.splice(editIndex, 1);
                    updateEditsCount();
                    renderAddedTexts();
                }
            });
            textEl.appendChild(removeBtn);
            
            textBlocksOverlay.appendChild(textEl);
        });
    }

    colorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            colorBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedColor = btn.dataset.color;
        });
    });

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255
        ] : [0, 0, 0];
    }

    function updateEditsCount() {
        editsCount.textContent = edits.length;
        undoBtn.disabled = edits.length === 0;
    }

    undoBtn.addEventListener('click', () => {
        if (edits.length > 0) {
            edits.pop();
            updateEditsCount();
            renderTextBlocks(currentPage);
            renderAddedTexts();
        }
    });

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!uploadedFile) {
            alert('Please upload a PDF file first');
            return;
        }

        if (edits.length === 0) {
            alert('No changes have been made to the PDF');
            return;
        }

        const formData = new FormData();
        formData.append('files', uploadedFile);
        formData.append('edits', JSON.stringify(edits));

        const submitBtn = editForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<svg class="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none"/></svg> Processing...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/process/edit', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                editToolLayout.style.display = 'none';
                resultArea.style.display = 'block';

                downloadButtons.innerHTML = '';
                const btn = document.createElement('a');
                btn.href = `/download/${result.filename}`;
                btn.className = 'btn btn-download';
                btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download Edited PDF`;
                downloadButtons.appendChild(btn);
            } else {
                showError(result.error || 'Failed to edit PDF');
            }
        } catch (error) {
            showError(error.message || 'An error occurred');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    function showError(message) {
        editToolLayout.style.display = 'none';
        errorArea.style.display = 'block';
        document.getElementById('errorMessage').textContent = message;
    }

    function resetTool() {
        pdfDoc = null;
        currentPage = 1;
        totalPages = 0;
        uploadedFile = null;
        edits = [];
        pagesTextData = null;
        currentEditingBlock = null;

        pageThumbnails.innerHTML = '';
        textBlocksOverlay.innerHTML = '';
        
        editToolLayout.style.display = 'none';
        resultArea.style.display = 'none';
        errorArea.style.display = 'none';
        initialUpload.style.display = 'block';
        
        fileInput.value = '';
        updateEditsCount();
    }

    processAnother.addEventListener('click', resetTool);
    tryAgain.addEventListener('click', resetTool);
});
