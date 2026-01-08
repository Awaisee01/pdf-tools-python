document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const dropzone = document.getElementById('dropzone');
    const initialUpload = document.getElementById('initialUpload');
    const editorWorkspace = document.getElementById('editorWorkspace');
    const pdfCanvas = document.getElementById('pdfCanvas');
    const editorOverlay = document.getElementById('editorOverlay');
    const resultArea = document.getElementById('resultArea');
    const errorArea = document.getElementById('errorArea');
    const downloadButtons = document.getElementById('downloadButtons');
    const processAnother = document.getElementById('processAnother');
    const tryAgain = document.getElementById('tryAgain');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const pageNumberDisplay = document.getElementById('pageNumberDisplay');
    const applyChangesBtn = document.getElementById('applyChangesBtn');
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    const undoTool = document.getElementById('undoTool');
    const inlineEditToolbar = document.getElementById('inlineEditToolbar');

    const selectTool = document.getElementById('selectTool');
    const textTool = document.getElementById('textTool');
    const linksTool = document.getElementById('linksTool');
    const formsTool = document.getElementById('formsTool');
    const imagesTool = document.getElementById('imagesTool');
    const signTool = document.getElementById('signTool');
    const whiteoutTool = document.getElementById('whiteoutTool');
    const annotateTool = document.getElementById('annotateTool');
    const shapesTool = document.getElementById('shapesTool');

    const textInputModal = document.getElementById('textInputModal');
    const imageUploadModal = document.getElementById('imageUploadModal');
    const signatureModal = document.getElementById('signatureModal');

    let pdfDoc = null;
    let currentPage = 1;
    let totalPages = 0;
    let uploadedFile = null;
    let serverFilename = null;
    let pdfScale = 1;
    let baseScale = 1;
    let zoomFactor = 1;
    let currentTool = 'select';
    let edits = [];
    let undoStack = [];
    let pendingClickPos = null;
    let selectedColor = '#000000';
    let pendingImageData = null;
    let textBlocks = {};
    let selectedTextBlock = null;
    let editedTextBlocks = {};

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
        undoStack = [];
        textBlocks = {};
        editedTextBlocks = {};
        selectedTextBlock = null;
        updateUndoButton();

        const arrayBuffer = await file.arrayBuffer();
        pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        totalPages = pdfDoc.numPages;

        await extractTextBlocks(file);

        initialUpload.style.display = 'none';
        editorWorkspace.style.display = 'flex';

        await renderPage(1);
        updatePageNavigation();

        // Upload immediately
        uploadFileToServer(file);
    }

    async function uploadFileToServer(file) {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                serverFilename = data.filename;
            } else {
                console.error("Background upload failed");
            }
        } catch (e) { console.error("Upload error", e); }
    }

    async function extractTextBlocks(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/extract-text-blocks', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success && result.pages) {
                result.pages.forEach(pageData => {
                    textBlocks[pageData.page] = pageData.text_blocks;
                });
            }
        } catch (error) {
            console.error('Failed to extract text blocks:', error);
        }
    }

    async function renderPage(pageNum, preserveZoom = false) {
        currentPage = pageNum;
        const page = await pdfDoc.getPage(pageNum);
        const canvasArea = document.querySelector('.editor-canvas-area');
        const availableWidth = canvasArea ? canvasArea.clientWidth - 60 : window.innerWidth - 100;
        const maxWidth = Math.max(availableWidth, 800);

        const viewport = page.getViewport({ scale: 1 });
        const scaleX = maxWidth > 0 ? maxWidth / viewport.width : 1;
        baseScale = Math.max(scaleX, 1);
        if (baseScale <= 0.1) baseScale = 1;

        if (!preserveZoom) {
            zoomFactor = 1;
        }

        pdfScale = baseScale * zoomFactor;

        const scaledViewport = page.getViewport({ scale: pdfScale });

        pdfCanvas.width = scaledViewport.width;
        pdfCanvas.height = scaledViewport.height;

        const ctx = pdfCanvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;

        editorOverlay.style.width = scaledViewport.width + 'px';
        editorOverlay.style.height = scaledViewport.height + 'px';

        renderEdits();
        if (currentTool === 'select') {
            renderTextBlocks();
        }
    }

    function renderEdits() {
        const existingEdits = editorOverlay.querySelectorAll('.edit-element');
        existingEdits.forEach(el => el.remove());

        edits.filter(e => e.page === currentPage).forEach((edit, index) => {
            const el = createEditElement(edit, index);
            if (el) editorOverlay.appendChild(el);
        });
    }

    function renderTextBlocks() {
        const existingBlocks = editorOverlay.querySelectorAll('.text-block-overlay');
        existingBlocks.forEach(el => el.remove());

        const existingPreviews = editorOverlay.querySelectorAll('.modified-text-preview');
        existingPreviews.forEach(el => el.remove());

        const pageBlocks = textBlocks[currentPage] || [];
        pageBlocks.forEach((block, index) => {
            const editedBlock = editedTextBlocks[block.id];
            if (editedBlock && editedBlock.deleted) return;

            const el = document.createElement('div');
            el.className = 'text-block-overlay';
            el.style.left = (block.x * pdfScale) + 'px';
            el.style.top = (block.y * pdfScale) + 'px';
            el.style.width = (block.width * pdfScale) + 'px';
            el.style.height = (block.height * pdfScale) + 'px';
            el.dataset.blockId = block.id;
            el.dataset.index = index;

            if (editedBlock && editedBlock.modified) {
                el.classList.add('modified');

                const preview = document.createElement('div');
                preview.className = 'modified-text-preview';
                preview.style.position = 'absolute';
                preview.style.left = (block.x * pdfScale) + 'px';
                preview.style.top = (block.y * pdfScale) + 'px';
                preview.style.minWidth = (block.width * pdfScale) + 'px';
                preview.style.fontSize = ((editedBlock.font_size || block.font_size) * pdfScale) + 'px';
                preview.style.color = '#000';
                preview.style.background = 'rgba(255, 255, 255, 0.95)';
                preview.style.padding = '2px 4px';
                preview.style.zIndex = '50';
                preview.style.whiteSpace = 'pre-wrap';
                preview.style.lineHeight = '1.2';
                preview.style.fontFamily = 'Arial, sans-serif';
                preview.style.pointerEvents = 'none';
                preview.textContent = editedBlock.new_text;
                editorOverlay.appendChild(preview);
            }

            el.addEventListener('click', (e) => {
                e.stopPropagation();
                selectTextBlock(block, el);
            });

            editorOverlay.appendChild(el);
        });
    }

    function selectTextBlock(block, element) {
        document.querySelectorAll('.text-block-overlay.selected').forEach(el => {
            el.classList.remove('selected');
        });

        element.classList.add('selected');
        selectedTextBlock = block;

        showInlineToolbar(element, block);
    }

    function showInlineToolbar(element, block) {
        const rect = element.getBoundingClientRect();
        const containerRect = editorOverlay.getBoundingClientRect();

        inlineEditToolbar.style.display = 'flex';
        inlineEditToolbar.style.left = (rect.left - containerRect.left) + 'px';
        inlineEditToolbar.style.top = (rect.top - containerRect.top - 45) + 'px';

        if (rect.top - containerRect.top < 50) {
            inlineEditToolbar.style.top = (rect.bottom - containerRect.top + 5) + 'px';
        }
    }

    function hideInlineToolbar() {
        inlineEditToolbar.style.display = 'none';
        selectedTextBlock = null;
        document.querySelectorAll('.text-block-overlay.selected').forEach(el => {
            el.classList.remove('selected');
        });
    }

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.text-block-overlay') &&
            !e.target.closest('#inlineEditToolbar') &&
            !e.target.closest('.inline-dropdown-menu')) {
            hideInlineToolbar();
        }
    });

    document.getElementById('inlineDelete')?.addEventListener('click', () => {
        if (selectedTextBlock) {
            editedTextBlocks[selectedTextBlock.id] = {
                ...selectedTextBlock,
                deleted: true
            };

            edits.push({
                type: 'delete',
                page: selectedTextBlock.page,
                rect: [selectedTextBlock.x, selectedTextBlock.y, selectedTextBlock.width, selectedTextBlock.height],
                blockId: selectedTextBlock.id
            });

            updateUndoButton();
            hideInlineToolbar();
            renderTextBlocks();
        }
    });

    document.getElementById('inlineFontBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = document.getElementById('fontDropdown');
        dropdown.classList.toggle('show');
        document.getElementById('colorDropdown')?.classList.remove('show');
    });

    document.getElementById('inlineColorBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = document.getElementById('colorDropdown');
        dropdown.classList.toggle('show');
        document.getElementById('fontDropdown')?.classList.remove('show');
    });

    document.querySelectorAll('#fontDropdown button').forEach(btn => {
        btn.addEventListener('click', () => {
            if (selectedTextBlock) {
                const font = btn.dataset.font;
                const existingEdit = editedTextBlocks[selectedTextBlock.id] || selectedTextBlock;

                editedTextBlocks[selectedTextBlock.id] = {
                    ...existingEdit,
                    font_name: font,
                    modified: true
                };

                edits.push({
                    type: 'modify',
                    page: selectedTextBlock.page,
                    original_rect: [selectedTextBlock.x, selectedTextBlock.y, selectedTextBlock.width, selectedTextBlock.height],
                    new_text: existingEdit.new_text || selectedTextBlock.text,
                    font_size: existingEdit.font_size || selectedTextBlock.font_size,
                    font_name: font,
                    blockId: selectedTextBlock.id
                });
                updateUndoButton();
            }
            document.getElementById('fontDropdown').classList.remove('show');
        });
    });

    document.querySelectorAll('#colorDropdown .color-swatch').forEach(btn => {
        btn.addEventListener('click', () => {
            if (selectedTextBlock) {
                const color = btn.dataset.color;
                const existingEdit = editedTextBlocks[selectedTextBlock.id] || selectedTextBlock;

                editedTextBlocks[selectedTextBlock.id] = {
                    ...existingEdit,
                    color: color,
                    modified: true
                };

                edits.push({
                    type: 'modify',
                    page: selectedTextBlock.page,
                    original_rect: [selectedTextBlock.x, selectedTextBlock.y, selectedTextBlock.width, selectedTextBlock.height],
                    new_text: existingEdit.new_text || selectedTextBlock.text,
                    font_size: existingEdit.font_size || selectedTextBlock.font_size,
                    color: color,
                    blockId: selectedTextBlock.id
                });
                updateUndoButton();
            }
            document.getElementById('colorDropdown').classList.remove('show');
        });
    });

    editorOverlay.addEventListener('dblclick', (e) => {
        if (currentTool !== 'select') return;

        const blockEl = e.target.closest('.text-block-overlay');
        if (!blockEl) return;

        const blockId = blockEl.dataset.blockId;
        const block = (textBlocks[currentPage] || []).find(b => b.id === blockId);
        if (!block) return;

        openTextEditModal(block);
    });

    function openTextEditModal(block) {
        const existingModal = document.getElementById('editTextModal');
        if (existingModal) existingModal.remove();

        const editedBlock = editedTextBlocks[block.id] || block;

        const livePreview = document.createElement('div');
        livePreview.id = 'liveTextPreview';
        livePreview.className = 'live-text-preview';
        livePreview.style.position = 'absolute';
        livePreview.style.left = (block.x * pdfScale) + 'px';
        livePreview.style.top = (block.y * pdfScale) + 'px';
        livePreview.style.minWidth = (block.width * pdfScale) + 'px';
        livePreview.style.minHeight = (block.height * pdfScale) + 'px';
        livePreview.style.fontSize = ((editedBlock.font_size || block.font_size) * pdfScale) + 'px';
        livePreview.style.color = '#000';
        livePreview.style.background = 'rgba(255, 255, 200, 0.9)';
        livePreview.style.padding = '2px 4px';
        livePreview.style.borderRadius = '2px';
        livePreview.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        livePreview.style.zIndex = '100';
        livePreview.style.whiteSpace = 'pre-wrap';
        livePreview.style.lineHeight = '1.2';
        livePreview.style.fontFamily = 'Arial, sans-serif';
        livePreview.textContent = editedBlock.new_text || editedBlock.text;
        editorOverlay.appendChild(livePreview);

        const modal = document.createElement('div');
        modal.id = 'editTextModal';
        modal.className = 'text-input-modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Text</h3>
                    <button type="button" class="modal-close" id="closeEditModal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="live-preview-hint" style="background:#e8f5e9;padding:8px 12px;border-radius:6px;margin-bottom:12px;font-size:13px;color:#2e7d32;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:6px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        Live Preview: See your changes on the PDF in real-time
                    </div>
                    <textarea id="editTextArea" rows="5" style="width:100%;padding:10px;font-size:14px;border:1px solid #ddd;border-radius:4px;">${editedBlock.new_text || editedBlock.text}</textarea>
                    <div class="text-options" style="margin-top:15px;">
                        <div class="option-row">
                            <label>Font Size:</label>
                            <input type="number" id="editFontSize" value="${Math.round(editedBlock.font_size || block.font_size)}" min="8" max="72">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="cancelEditText">Cancel</button>
                    <button type="button" class="btn btn-primary" id="saveEditText">Save Changes</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const textArea = document.getElementById('editTextArea');
        const fontSizeInput = document.getElementById('editFontSize');

        textArea.addEventListener('input', () => {
            livePreview.textContent = textArea.value;
        });

        fontSizeInput.addEventListener('input', () => {
            const newSize = parseInt(fontSizeInput.value) || block.font_size;
            livePreview.style.fontSize = (newSize * pdfScale) + 'px';
        });

        const removeLivePreview = () => {
            const preview = document.getElementById('liveTextPreview');
            if (preview) preview.remove();
        };

        document.getElementById('closeEditModal').addEventListener('click', () => {
            removeLivePreview();
            modal.remove();
        });
        document.getElementById('cancelEditText').addEventListener('click', () => {
            removeLivePreview();
            modal.remove();
        });

        document.getElementById('saveEditText').addEventListener('click', () => {
            const newText = document.getElementById('editTextArea').value;
            const fontSize = parseInt(document.getElementById('editFontSize').value) || block.font_size;

            editedTextBlocks[block.id] = {
                ...block,
                new_text: newText,
                font_size: fontSize,
                modified: true
            };

            edits.push({
                type: 'modify',
                page: block.page,
                original_rect: [block.x, block.y, block.width, block.height],
                new_text: newText,
                font_size: fontSize,
                blockId: block.id
            });

            updateUndoButton();
            removeLivePreview();
            modal.remove();
            hideInlineToolbar();
            renderTextBlocks();
        });
    }

    function createEditElement(edit, index) {
        const wrapper = document.createElement('div');
        wrapper.className = 'edit-element edit-' + edit.type;
        wrapper.style.left = (edit.x * pdfScale) + 'px';
        wrapper.style.top = (edit.y * pdfScale) + 'px';
        wrapper.dataset.index = index;

        if (edit.type === 'text') {
            wrapper.style.fontSize = (edit.fontSize * pdfScale) + 'px';
            wrapper.style.color = edit.color;
            wrapper.textContent = edit.content;
        } else if (edit.type === 'image' || edit.type === 'signature') {
            const img = document.createElement('img');
            img.src = edit.data;
            img.style.width = (edit.width * pdfScale) + 'px';
            img.style.height = (edit.height * pdfScale) + 'px';
            img.draggable = false;
            wrapper.appendChild(img);
        } else if (edit.type === 'whiteout') {
            wrapper.style.width = (edit.width * pdfScale) + 'px';
            wrapper.style.height = (edit.height * pdfScale) + 'px';
            wrapper.style.background = 'white';
        } else if (edit.type === 'shape') {
            wrapper.style.width = (edit.width * pdfScale) + 'px';
            wrapper.style.height = (edit.height * pdfScale) + 'px';
            wrapper.style.border = '2px solid ' + (edit.color || '#000');
            if (edit.shape === 'circle') {
                wrapper.style.borderRadius = '50%';
            }
        } else if (edit.type === 'add') {
            wrapper.style.fontSize = ((edit.font_size || 12) * pdfScale) + 'px';
            wrapper.style.color = edit.color || '#000';
            wrapper.textContent = edit.text || '';
        }

        const removeBtn = document.createElement('button');
        removeBtn.className = 'edit-remove-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeEdit(index);
        });
        wrapper.appendChild(removeBtn);

        makeDraggable(wrapper, edit);

        return wrapper;
    }

    function makeDraggable(element, edit) {
        let isDragging = false;
        let startX, startY, origX, origY;

        element.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('edit-remove-btn')) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            origX = edit.x;
            origY = edit.y;
            element.style.cursor = 'grabbing';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = (e.clientX - startX) / pdfScale;
            const dy = (e.clientY - startY) / pdfScale;
            edit.x = origX + dx;
            edit.y = origY + dy;
            element.style.left = (edit.x * pdfScale) + 'px';
            element.style.top = (edit.y * pdfScale) + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                element.style.cursor = 'grab';
            }
        });
    }

    function removeEdit(index) {
        const pageEdits = edits.filter(e => e.page === currentPage);
        const globalIndex = edits.indexOf(pageEdits[index]);
        if (globalIndex >= 0) {
            const removedEdit = edits.splice(globalIndex, 1)[0];
            undoStack.push(removedEdit);

            if (removedEdit.blockId && editedTextBlocks[removedEdit.blockId]) {
                delete editedTextBlocks[removedEdit.blockId];
            }

            updateUndoButton();
            renderEdits();
            if (currentTool === 'select') {
                renderTextBlocks();
            }
        }
    }

    function updateUndoButton() {
        if (undoTool) {
            undoTool.disabled = undoStack.length === 0 && edits.length === 0;
        }
    }

    function updatePageNavigation() {
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        pageNumberDisplay.textContent = currentPage;
        prevPageBtn.disabled = currentPage <= 1;
        nextPageBtn.disabled = currentPage >= totalPages;
    }

    prevPageBtn.addEventListener('click', async () => {
        if (currentPage > 1) {
            currentPage--;
            await renderPage(currentPage);
            updatePageNavigation();
        }
    });

    nextPageBtn.addEventListener('click', async () => {
        if (currentPage < totalPages) {
            currentPage++;
            await renderPage(currentPage);
            updatePageNavigation();
        }
    });

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', async () => {
            if (zoomFactor < 3) {
                zoomFactor = Math.min(zoomFactor + 0.25, 3);
                await renderPage(currentPage, true);
            }
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', async () => {
            if (zoomFactor > 0.5) {
                zoomFactor = Math.max(zoomFactor - 0.25, 0.5);
                await renderPage(currentPage, true);
            }
        });
    }

    const toolButtons = [selectTool, textTool, linksTool, formsTool, imagesTool, signTool, whiteoutTool, annotateTool, shapesTool];

    function setActiveTool(btn, toolName) {
        toolButtons.forEach(b => b && b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        currentTool = toolName;
        updateOverlayCursor();
        hideInlineToolbar();

        const existingBlocks = editorOverlay.querySelectorAll('.text-block-overlay');
        if (toolName === 'select') {
            renderTextBlocks();
        } else {
            existingBlocks.forEach(el => el.remove());
        }
    }

    function updateOverlayCursor() {
        if (currentTool === 'select') {
            editorOverlay.style.cursor = 'text';
        } else if (currentTool === 'whiteout' || currentTool === 'shape') {
            editorOverlay.style.cursor = 'crosshair';
        } else if (currentTool === 'text' || currentTool === 'image' || currentTool === 'sign') {
            editorOverlay.style.cursor = 'crosshair';
        } else {
            editorOverlay.style.cursor = 'default';
        }
    }

    if (selectTool) selectTool.addEventListener('click', () => setActiveTool(selectTool, 'select'));
    if (textTool) textTool.addEventListener('click', () => setActiveTool(textTool, 'text'));
    if (linksTool) linksTool.addEventListener('click', () => setActiveTool(linksTool, 'link'));
    if (formsTool) formsTool.addEventListener('click', () => setActiveTool(formsTool, 'form'));
    if (imagesTool) imagesTool.addEventListener('click', () => setActiveTool(imagesTool, 'image'));
    if (signTool) signTool.addEventListener('click', () => setActiveTool(signTool, 'sign'));
    if (whiteoutTool) whiteoutTool.addEventListener('click', () => setActiveTool(whiteoutTool, 'whiteout'));
    if (annotateTool) annotateTool.addEventListener('click', () => setActiveTool(annotateTool, 'annotate'));
    if (shapesTool) shapesTool.addEventListener('click', () => setActiveTool(shapesTool, 'shape'));

    editorOverlay.addEventListener('click', (e) => {
        if (e.target !== editorOverlay) return;

        const rect = editorOverlay.getBoundingClientRect();
        const x = (e.clientX - rect.left) / pdfScale;
        const y = (e.clientY - rect.top) / pdfScale;

        pendingClickPos = { x, y };

        if (currentTool === 'text') {
            openTextModal();
        } else if (currentTool === 'image') {
            openImageModal();
        } else if (currentTool === 'sign') {
            openSignatureModal();
        } else if (currentTool === 'whiteout') {
            startWhiteout(e);
        } else if (currentTool === 'shape') {
            startShape(e);
        }
    });

    let whiteoutStart = null;
    let whiteoutPreview = null;

    function startWhiteout(e) {
        const rect = editorOverlay.getBoundingClientRect();
        whiteoutStart = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        whiteoutPreview = document.createElement('div');
        whiteoutPreview.className = 'whiteout-preview';
        whiteoutPreview.style.left = whiteoutStart.x + 'px';
        whiteoutPreview.style.top = whiteoutStart.y + 'px';
        editorOverlay.appendChild(whiteoutPreview);

        const moveHandler = (moveE) => {
            const currentX = moveE.clientX - rect.left;
            const currentY = moveE.clientY - rect.top;
            const width = currentX - whiteoutStart.x;
            const height = currentY - whiteoutStart.y;

            whiteoutPreview.style.width = Math.abs(width) + 'px';
            whiteoutPreview.style.height = Math.abs(height) + 'px';
            whiteoutPreview.style.left = (width < 0 ? currentX : whiteoutStart.x) + 'px';
            whiteoutPreview.style.top = (height < 0 ? currentY : whiteoutStart.y) + 'px';
        };

        const upHandler = (upE) => {
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', upHandler);

            const currentX = upE.clientX - rect.left;
            const currentY = upE.clientY - rect.top;

            const x = Math.min(whiteoutStart.x, currentX) / pdfScale;
            const y = Math.min(whiteoutStart.y, currentY) / pdfScale;
            const width = Math.abs(currentX - whiteoutStart.x) / pdfScale;
            const height = Math.abs(currentY - whiteoutStart.y) / pdfScale;

            if (width > 5 && height > 5) {
                edits.push({
                    type: 'whiteout',
                    page: currentPage,
                    x, y, width, height
                });
                updateUndoButton();
            }

            if (whiteoutPreview) {
                whiteoutPreview.remove();
                whiteoutPreview = null;
            }
            renderEdits();
        };

        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
    }

    function startShape(e) {
        const rect = editorOverlay.getBoundingClientRect();
        const startPos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        const shapePreview = document.createElement('div');
        shapePreview.className = 'shape-preview';
        shapePreview.style.left = startPos.x + 'px';
        shapePreview.style.top = startPos.y + 'px';
        editorOverlay.appendChild(shapePreview);

        const moveHandler = (moveE) => {
            const currentX = moveE.clientX - rect.left;
            const currentY = moveE.clientY - rect.top;
            const width = currentX - startPos.x;
            const height = currentY - startPos.y;

            shapePreview.style.width = Math.abs(width) + 'px';
            shapePreview.style.height = Math.abs(height) + 'px';
            shapePreview.style.left = (width < 0 ? currentX : startPos.x) + 'px';
            shapePreview.style.top = (height < 0 ? currentY : startPos.y) + 'px';
        };

        const upHandler = (upE) => {
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', upHandler);

            const currentX = upE.clientX - rect.left;
            const currentY = upE.clientY - rect.top;

            const x = Math.min(startPos.x, currentX) / pdfScale;
            const y = Math.min(startPos.y, currentY) / pdfScale;
            const width = Math.abs(currentX - startPos.x) / pdfScale;
            const height = Math.abs(currentY - startPos.y) / pdfScale;

            if (width > 10 && height > 10) {
                edits.push({
                    type: 'shape',
                    shape: 'rectangle',
                    page: currentPage,
                    x, y, width, height,
                    color: selectedColor
                });
                updateUndoButton();
            }

            shapePreview.remove();
            renderEdits();
        };

        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
    }

    function openTextModal() {
        textInputModal.style.display = 'flex';
        document.getElementById('textInputArea').value = '';
        document.getElementById('textInputArea').focus();
    }

    document.getElementById('closeTextModal').addEventListener('click', () => {
        textInputModal.style.display = 'none';
    });

    document.getElementById('cancelText').addEventListener('click', () => {
        textInputModal.style.display = 'none';
    });

    document.getElementById('confirmText').addEventListener('click', () => {
        const text = document.getElementById('textInputArea').value.trim();
        const fontSize = parseInt(document.getElementById('textFontSize').value) || 14;

        if (text && pendingClickPos) {
            edits.push({
                type: 'text',
                page: currentPage,
                x: pendingClickPos.x,
                y: pendingClickPos.y,
                content: text,
                fontSize: fontSize,
                color: selectedColor
            });
            updateUndoButton();
            renderEdits();
        }

        textInputModal.style.display = 'none';
        pendingClickPos = null;
    });

    document.querySelectorAll('.color-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.color-opt').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedColor = btn.dataset.color;
        });
    });

    function openImageModal() {
        imageUploadModal.style.display = 'flex';
        pendingImageData = null;
        document.getElementById('imagePreview').style.display = 'none';
        document.getElementById('confirmImage').disabled = true;
    }

    document.getElementById('closeImageModal').addEventListener('click', () => {
        imageUploadModal.style.display = 'none';
    });

    document.getElementById('cancelImage').addEventListener('click', () => {
        imageUploadModal.style.display = 'none';
    });

    document.getElementById('imageDropzone').addEventListener('click', () => {
        document.getElementById('imageFileInput').click();
    });

    document.getElementById('imageFileInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const maxSize = 1500;

                    if (width > maxSize || height > maxSize) {
                        if (width > height) {
                            height = Math.round((height * maxSize) / width);
                            width = maxSize;
                        } else {
                            width = Math.round((width * maxSize) / height);
                            height = maxSize;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    pendingImageData = canvas.toDataURL('image/jpeg', 0.85); // Compress slightly
                    document.getElementById('previewImg').src = pendingImageData;
                    document.getElementById('imagePreview').style.display = 'block';
                    document.getElementById('confirmImage').disabled = false;
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('confirmImage').addEventListener('click', () => {
        if (pendingImageData && pendingClickPos) {
            edits.push({
                type: 'image',
                page: currentPage,
                x: pendingClickPos.x,
                y: pendingClickPos.y,
                width: 150,
                height: 100,
                data: pendingImageData
            });
            updateUndoButton();
            renderEdits();
        }
        imageUploadModal.style.display = 'none';
        pendingClickPos = null;
    });

    const signatureCanvas = document.getElementById('signatureCanvas');
    let sigCtx = null;
    let isDrawingSignature = false;

    function openSignatureModal() {
        signatureModal.style.display = 'flex';
        sigCtx = signatureCanvas.getContext('2d');
        sigCtx.fillStyle = 'white';
        sigCtx.fillRect(0, 0, signatureCanvas.width, signatureCanvas.height);
        sigCtx.strokeStyle = '#000';
        sigCtx.lineWidth = 2;
        sigCtx.lineCap = 'round';
    }

    document.getElementById('closeSignModal').addEventListener('click', () => {
        signatureModal.style.display = 'none';
    });

    document.getElementById('cancelSignature').addEventListener('click', () => {
        signatureModal.style.display = 'none';
    });

    signatureCanvas.addEventListener('mousedown', (e) => {
        isDrawingSignature = true;
        sigCtx.beginPath();
        sigCtx.moveTo(e.offsetX, e.offsetY);
    });

    signatureCanvas.addEventListener('mousemove', (e) => {
        if (!isDrawingSignature) return;
        sigCtx.lineTo(e.offsetX, e.offsetY);
        sigCtx.stroke();
    });

    signatureCanvas.addEventListener('mouseup', () => {
        isDrawingSignature = false;
    });

    signatureCanvas.addEventListener('mouseleave', () => {
        isDrawingSignature = false;
    });

    document.getElementById('clearSignature').addEventListener('click', () => {
        sigCtx.fillStyle = 'white';
        sigCtx.fillRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    });

    document.querySelectorAll('.sig-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.sig-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.sig-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab + 'Panel').classList.add('active');
        });
    });

    document.getElementById('confirmSignature').addEventListener('click', () => {
        const activeTab = document.querySelector('.sig-tab.active').dataset.tab;
        let sigData = null;

        if (activeTab === 'draw') {
            sigData = signatureCanvas.toDataURL('image/png');
        } else if (activeTab === 'type') {
            const text = document.getElementById('typedSignature').value;
            const font = document.getElementById('signatureFont').value;
            if (text) {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = 300;
                tempCanvas.height = 80;
                const ctx = tempCanvas.getContext('2d');
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, 300, 80);
                ctx.font = '40px ' + font;
                ctx.fillStyle = '#000';
                ctx.fillText(text, 10, 55);
                sigData = tempCanvas.toDataURL('image/png');
            }
        }

        if (sigData && pendingClickPos) {
            edits.push({
                type: 'signature',
                page: currentPage,
                x: pendingClickPos.x,
                y: pendingClickPos.y,
                width: 150,
                height: 50,
                data: sigData
            });
            updateUndoButton();
            renderEdits();
        }

        signatureModal.style.display = 'none';
        pendingClickPos = null;
    });

    if (undoTool) {
        undoTool.addEventListener('click', () => {
            if (edits.length > 0) {
                const removedEdit = edits.pop();
                undoStack.push(removedEdit);

                if (removedEdit.blockId && editedTextBlocks[removedEdit.blockId]) {
                    delete editedTextBlocks[removedEdit.blockId];
                }

                updateUndoButton();
                renderEdits();
                if (currentTool === 'select') {
                    renderTextBlocks();
                }
            }
        });
    }

    applyChangesBtn.addEventListener('click', async () => {
        if (!uploadedFile) {
            alert('Please upload a PDF file first');
            return;
        }

        if (edits.length === 0) {
            alert('No changes have been made');
            return;
        }

        const formData = new FormData();
        if (serverFilename) {
            formData.append('server_filename', serverFilename);
        } else {
            // Fallback if upload failed or wasn't done
            formData.append('files', uploadedFile);
        }
        formData.append('edits', JSON.stringify(edits));

        applyChangesBtn.disabled = true;
        applyChangesBtn.innerHTML = 'Processing...';

        try {
            const response = await fetch('/process/edit', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                editorWorkspace.style.display = 'none';
                resultArea.style.display = 'block';

                downloadButtons.innerHTML = '';
                const btn = document.createElement('a');
                btn.href = `/download/${result.filename}`;
                btn.className = 'btn btn-download';
                btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download Edited PDF';
                downloadButtons.appendChild(btn);
            } else {
                showError(result.error || 'Failed to edit PDF');
            }
        } catch (error) {
            showError(error.message || 'An error occurred');
        } finally {
            applyChangesBtn.disabled = false;
            applyChangesBtn.innerHTML = 'Apply changes <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
        }
    });

    function showError(message) {
        editorWorkspace.style.display = 'none';
        errorArea.style.display = 'block';
        document.getElementById('errorMessage').textContent = message;
    }

    function resetTool() {
        pdfDoc = null;
        currentPage = 1;
        totalPages = 0;
        uploadedFile = null;
        serverFilename = null;
        edits = [];
        undoStack = [];
        pendingClickPos = null;
        pendingImageData = null;
        textBlocks = {};
        editedTextBlocks = {};
        selectedTextBlock = null;

        editorOverlay.innerHTML = '';
        hideInlineToolbar();

        editorWorkspace.style.display = 'none';
        resultArea.style.display = 'none';
        errorArea.style.display = 'none';
        initialUpload.style.display = 'block';

        fileInput.value = '';
        updateUndoButton();
    }

    processAnother.addEventListener('click', resetTool);
    tryAgain.addEventListener('click', resetTool);
});
