document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const dropzone = document.getElementById('dropzone');
    const initialUpload = document.getElementById('initialUpload');
    const cropToolLayout = document.getElementById('cropToolLayout');
    const pdfCanvas = document.getElementById('pdfCanvas');
    const cropOverlay = document.getElementById('cropOverlay');
    const cropSelection = document.getElementById('cropSelection');
    const cropForm = document.getElementById('cropForm');
    const resultArea = document.getElementById('resultArea');
    const errorArea = document.getElementById('errorArea');
    const downloadButtons = document.getElementById('downloadButtons');
    const processAnother = document.getElementById('processAnother');
    const tryAgain = document.getElementById('tryAgain');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const resetCrop = document.getElementById('resetCrop');
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    const zoomFitBtn = document.getElementById('zoomFit');
    const zoomLevelSpan = document.getElementById('zoomLevel');

    let pdfDoc = null;
    let currentPage = 1;
    let totalPages = 0;
    let uploadedFile = null;
    let pdfScale = 1;
    let baseScale = 1;
    let zoomFactor = 1;
    
    let cropRect = { x: 0, y: 0, width: 0, height: 0 };
    let isDragging = false;
    let isResizing = false;
    let isDrawing = false;
    let activeHandle = null;
    let startX, startY;
    let startRect = {};
    let canvasWidth = 0;
    let canvasHeight = 0;
    let pageWidth = 0;
    let pageHeight = 0;

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
        const arrayBuffer = await file.arrayBuffer();
        pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        totalPages = pdfDoc.numPages;

        initialUpload.style.display = 'none';
        cropToolLayout.style.display = 'grid';

        await renderPage(1);
        updatePageNavigation();
        resetCropSelection();
    }

    async function renderPage(pageNum, preserveZoom = false) {
        const page = await pdfDoc.getPage(pageNum);
        const container = document.getElementById('pdfCanvasContainer');
        const maxWidth = container.clientWidth - 40 || 600;
        const maxHeight = container.clientHeight - 40 || window.innerHeight * 0.7;
        
        const viewport = page.getViewport({ scale: 1 });
        pageWidth = viewport.width;
        pageHeight = viewport.height;
        
        const scaleX = maxWidth > 0 ? maxWidth / viewport.width : 1;
        const scaleY = maxHeight > 0 ? maxHeight / viewport.height : 1;
        baseScale = Math.min(scaleX, scaleY, 1.5);
        if (baseScale <= 0.1) baseScale = 1;
        
        if (!preserveZoom) {
            zoomFactor = 1;
            updateZoomLevel();
        }
        
        pdfScale = baseScale * zoomFactor;
        
        const scaledViewport = page.getViewport({ scale: pdfScale });

        pdfCanvas.width = scaledViewport.width;
        pdfCanvas.height = scaledViewport.height;
        canvasWidth = scaledViewport.width;
        canvasHeight = scaledViewport.height;

        const ctx = pdfCanvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;

        cropOverlay.style.width = canvasWidth + 'px';
        cropOverlay.style.height = canvasHeight + 'px';
        
        document.getElementById('currentPageInput').value = pageNum;
    }
    
    function updateZoomLevel() {
        if (zoomLevelSpan) {
            zoomLevelSpan.textContent = Math.round(zoomFactor * 100) + '%';
        }
    }
    
    async function zoomIn() {
        if (zoomFactor < 3) {
            zoomFactor = Math.min(zoomFactor + 0.25, 3);
            updateZoomLevel();
            await renderPage(currentPage, true);
            updateCropSelectionDisplay();
        }
    }
    
    async function zoomOut() {
        if (zoomFactor > 0.5) {
            zoomFactor = Math.max(zoomFactor - 0.25, 0.5);
            updateZoomLevel();
            await renderPage(currentPage, true);
            updateCropSelectionDisplay();
        }
    }
    
    async function zoomFit() {
        zoomFactor = 1;
        updateZoomLevel();
        await renderPage(currentPage, true);
        updateCropSelectionDisplay();
    }
    
    if (zoomInBtn) zoomInBtn.addEventListener('click', zoomIn);
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', zoomOut);
    if (zoomFitBtn) zoomFitBtn.addEventListener('click', zoomFit);

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
            updateCropSelectionDisplay();
        }
    });

    nextPageBtn.addEventListener('click', async () => {
        if (currentPage < totalPages) {
            currentPage++;
            await renderPage(currentPage);
            updatePageNavigation();
            updateCropSelectionDisplay();
        }
    });

    function resetCropSelection() {
        const padding = 20;
        cropRect = {
            x: padding,
            y: padding,
            width: canvasWidth - (padding * 2),
            height: canvasHeight - (padding * 2)
        };
        updateCropSelectionDisplay();
    }

    function updateCropSelectionDisplay() {
        cropSelection.style.left = cropRect.x + 'px';
        cropSelection.style.top = cropRect.y + 'px';
        cropSelection.style.width = cropRect.width + 'px';
        cropSelection.style.height = cropRect.height + 'px';
        cropSelection.style.display = 'block';
        
        updateHiddenInputs();
    }

    function updateHiddenInputs() {
        const scaleRatio = 1 / pdfScale;
        
        const left = Math.max(0, cropRect.x * scaleRatio);
        const top = Math.max(0, cropRect.y * scaleRatio);
        const right = Math.max(0, (canvasWidth - cropRect.x - cropRect.width) * scaleRatio);
        const bottom = Math.max(0, (canvasHeight - cropRect.y - cropRect.height) * scaleRatio);
        
        document.getElementById('cropLeftInput').value = left.toFixed(2);
        document.getElementById('cropTopInput').value = top.toFixed(2);
        document.getElementById('cropRightInput').value = right.toFixed(2);
        document.getElementById('cropBottomInput').value = bottom.toFixed(2);
        
        const cropPagesValue = document.querySelector('input[name="cropPages"]:checked').value;
        document.getElementById('cropPagesInput').value = cropPagesValue;
    }

    document.querySelectorAll('input[name="cropPages"]').forEach(radio => {
        radio.addEventListener('change', updateHiddenInputs);
    });

    resetCrop.addEventListener('click', (e) => {
        e.preventDefault();
        resetCropSelection();
    });

    cropOverlay.addEventListener('mousedown', startAction);
    cropOverlay.addEventListener('mousemove', handleAction);
    cropOverlay.addEventListener('mouseup', endAction);
    cropOverlay.addEventListener('mouseleave', endAction);

    cropOverlay.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        startAction({
            clientX: touch.clientX,
            clientY: touch.clientY,
            target: e.target,
            preventDefault: () => e.preventDefault()
        });
    });

    cropOverlay.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        handleAction({
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => e.preventDefault()
        });
    });

    cropOverlay.addEventListener('touchend', endAction);

    function startAction(e) {
        const rect = cropOverlay.getBoundingClientRect();
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;
        
        if (e.target.classList.contains('crop-handle')) {
            isResizing = true;
            const handleTypes = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'bottom-center', 'left-center', 'right-center'];
            activeHandle = handleTypes.find(h => e.target.classList.contains(h)) || '';
            startRect = { ...cropRect };
            e.preventDefault();
        } else if (e.target.id === 'cropDragArea' || e.target.id === 'cropSelection') {
            isDragging = true;
            startRect = { ...cropRect };
            e.preventDefault();
        } else if (e.target === cropOverlay || e.target === pdfCanvas) {
            isDrawing = true;
            cropRect = {
                x: startX,
                y: startY,
                width: 0,
                height: 0
            };
            updateCropSelectionDisplay();
        }
    }

    function handleAction(e) {
        if (!isDragging && !isResizing && !isDrawing) return;
        
        const rect = cropOverlay.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        const dx = currentX - startX;
        const dy = currentY - startY;
        
        if (isDragging) {
            cropRect.x = Math.max(0, Math.min(canvasWidth - cropRect.width, startRect.x + dx));
            cropRect.y = Math.max(0, Math.min(canvasHeight - cropRect.height, startRect.y + dy));
        } else if (isResizing) {
            resizeCrop(dx, dy, activeHandle);
        } else if (isDrawing) {
            const newWidth = currentX - startX;
            const newHeight = currentY - startY;
            
            if (newWidth >= 0) {
                cropRect.x = startX;
                cropRect.width = Math.min(newWidth, canvasWidth - startX);
            } else {
                cropRect.x = Math.max(0, currentX);
                cropRect.width = startX - cropRect.x;
            }
            
            if (newHeight >= 0) {
                cropRect.y = startY;
                cropRect.height = Math.min(newHeight, canvasHeight - startY);
            } else {
                cropRect.y = Math.max(0, currentY);
                cropRect.height = startY - cropRect.y;
            }
        }
        
        updateCropSelectionDisplay();
        e.preventDefault();
    }

    function resizeCrop(dx, dy, handle) {
        const minSize = 20;
        
        switch(handle) {
            case 'top-left':
                cropRect.x = Math.max(0, Math.min(startRect.x + dx, startRect.x + startRect.width - minSize));
                cropRect.y = Math.max(0, Math.min(startRect.y + dy, startRect.y + startRect.height - minSize));
                cropRect.width = startRect.width - (cropRect.x - startRect.x);
                cropRect.height = startRect.height - (cropRect.y - startRect.y);
                break;
            case 'top-right':
                cropRect.y = Math.max(0, Math.min(startRect.y + dy, startRect.y + startRect.height - minSize));
                cropRect.width = Math.max(minSize, Math.min(startRect.width + dx, canvasWidth - startRect.x));
                cropRect.height = startRect.height - (cropRect.y - startRect.y);
                break;
            case 'bottom-left':
                cropRect.x = Math.max(0, Math.min(startRect.x + dx, startRect.x + startRect.width - minSize));
                cropRect.width = startRect.width - (cropRect.x - startRect.x);
                cropRect.height = Math.max(minSize, Math.min(startRect.height + dy, canvasHeight - startRect.y));
                break;
            case 'bottom-right':
                cropRect.width = Math.max(minSize, Math.min(startRect.width + dx, canvasWidth - startRect.x));
                cropRect.height = Math.max(minSize, Math.min(startRect.height + dy, canvasHeight - startRect.y));
                break;
            case 'top-center':
                cropRect.y = Math.max(0, Math.min(startRect.y + dy, startRect.y + startRect.height - minSize));
                cropRect.height = startRect.height - (cropRect.y - startRect.y);
                break;
            case 'bottom-center':
                cropRect.height = Math.max(minSize, Math.min(startRect.height + dy, canvasHeight - startRect.y));
                break;
            case 'left-center':
                cropRect.x = Math.max(0, Math.min(startRect.x + dx, startRect.x + startRect.width - minSize));
                cropRect.width = startRect.width - (cropRect.x - startRect.x);
                break;
            case 'right-center':
                cropRect.width = Math.max(minSize, Math.min(startRect.width + dx, canvasWidth - startRect.x));
                break;
        }
    }

    function endAction() {
        isDragging = false;
        isResizing = false;
        isDrawing = false;
        activeHandle = null;
        
        if (cropRect.width < 20 || cropRect.height < 20) {
            resetCropSelection();
        }
    }

    cropForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!uploadedFile) {
            alert('Please upload a PDF file first');
            return;
        }

        updateHiddenInputs();

        const formData = new FormData();
        formData.append('files', uploadedFile);
        formData.append('left', document.getElementById('cropLeftInput').value);
        formData.append('top', document.getElementById('cropTopInput').value);
        formData.append('right', document.getElementById('cropRightInput').value);
        formData.append('bottom', document.getElementById('cropBottomInput').value);
        formData.append('pages', document.getElementById('cropPagesInput').value);
        formData.append('current_page', document.getElementById('currentPageInput').value);

        const submitBtn = cropForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<svg class="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none"/></svg> Processing...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/process/crop', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                cropToolLayout.style.display = 'none';
                resultArea.style.display = 'block';

                downloadButtons.innerHTML = '';
                const btn = document.createElement('a');
                btn.href = `/download/${result.output_path.split('/').pop()}`;
                btn.className = 'btn btn-download';
                btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download Cropped PDF`;
                downloadButtons.appendChild(btn);
            } else {
                showError(result.error || 'Failed to crop PDF');
            }
        } catch (error) {
            showError(error.message || 'An error occurred');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    function showError(message) {
        cropToolLayout.style.display = 'none';
        errorArea.style.display = 'block';
        document.getElementById('errorMessage').textContent = message;
    }

    function resetTool() {
        pdfDoc = null;
        currentPage = 1;
        totalPages = 0;
        uploadedFile = null;
        cropRect = { x: 0, y: 0, width: 0, height: 0 };
        
        cropToolLayout.style.display = 'none';
        resultArea.style.display = 'none';
        errorArea.style.display = 'none';
        initialUpload.style.display = 'block';
        
        fileInput.value = '';
        cropSelection.style.display = 'none';
    }

    processAnother.addEventListener('click', resetTool);
    tryAgain.addEventListener('click', resetTool);
});
