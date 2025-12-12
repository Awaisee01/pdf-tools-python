document.addEventListener('DOMContentLoaded', function() {
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
    let pdfScale = 1;
    let baseScale = 1;
    let zoomFactor = 1;
    let currentTool = 'text';
    let edits = [];
    let undoStack = [];
    let pendingClickPos = null;
    let selectedColor = '#000000';
    let pendingImageData = null;

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
        updateUndoButton();

        const arrayBuffer = await file.arrayBuffer();
        pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        totalPages = pdfDoc.numPages;

        initialUpload.style.display = 'none';
        editorWorkspace.style.display = 'flex';

        await renderPage(1);
        updatePageNavigation();
    }

    async function renderPage(pageNum, preserveZoom = false) {
        const page = await pdfDoc.getPage(pageNum);
        const container = document.getElementById('editorCanvasWrapper');
        const maxWidth = container.clientWidth - 40 || 700;
        const maxHeight = window.innerHeight - 250;

        const viewport = page.getViewport({ scale: 1 });
        const scaleX = maxWidth > 0 ? maxWidth / viewport.width : 1;
        const scaleY = maxHeight > 0 ? maxHeight / viewport.height : 1;
        baseScale = Math.min(scaleX, scaleY, 1.5);
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
    }

    function renderEdits() {
        editorOverlay.innerHTML = '';

        edits.filter(e => e.page === currentPage).forEach((edit, index) => {
            const el = createEditElement(edit, index);
            if (el) editorOverlay.appendChild(el);
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
            undoStack.push(edits.splice(globalIndex, 1)[0]);
            updateUndoButton();
            renderEdits();
        }
    }

    function updateUndoButton() {
        undoTool.disabled = undoStack.length === 0 && edits.length === 0;
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

    const toolButtons = [textTool, linksTool, formsTool, imagesTool, signTool, whiteoutTool, annotateTool, shapesTool];

    function setActiveTool(btn, toolName) {
        toolButtons.forEach(b => b && b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        currentTool = toolName;
        updateOverlayCursor();
    }

    function updateOverlayCursor() {
        if (currentTool === 'whiteout') {
            editorOverlay.style.cursor = 'crosshair';
        } else if (currentTool === 'text' || currentTool === 'image' || currentTool === 'sign') {
            editorOverlay.style.cursor = 'crosshair';
        } else {
            editorOverlay.style.cursor = 'default';
        }
    }

    textTool.addEventListener('click', () => setActiveTool(textTool, 'text'));
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
                pendingImageData = ev.target.result;
                document.getElementById('previewImg').src = pendingImageData;
                document.getElementById('imagePreview').style.display = 'block';
                document.getElementById('confirmImage').disabled = false;
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

    undoTool.addEventListener('click', () => {
        if (edits.length > 0) {
            undoStack.push(edits.pop());
            updateUndoButton();
            renderEdits();
        }
    });

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
        formData.append('files', uploadedFile);
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
        edits = [];
        undoStack = [];
        pendingClickPos = null;
        pendingImageData = null;

        editorOverlay.innerHTML = '';

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
