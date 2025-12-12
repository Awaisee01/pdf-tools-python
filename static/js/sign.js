document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const dropzone = document.getElementById('dropzone');
    const initialUpload = document.getElementById('initialUpload');
    const signToolLayout = document.getElementById('signToolLayout');
    const pageThumbnails = document.getElementById('pageThumbnails');
    const pdfCanvas = document.getElementById('pdfCanvas');
    const signatureOverlay = document.getElementById('signatureOverlay');
    const signForm = document.getElementById('signForm');
    const resultArea = document.getElementById('resultArea');
    const errorArea = document.getElementById('errorArea');
    const downloadButtons = document.getElementById('downloadButtons');
    const processAnother = document.getElementById('processAnother');
    const tryAgain = document.getElementById('tryAgain');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const signatureModal = document.getElementById('signatureModal');
    const closeModal = document.getElementById('closeModal');
    const applySignature = document.getElementById('applySignature');
    const addSignatureField = document.getElementById('addSignatureField');
    const addInitialsField = document.getElementById('addInitialsField');
    const addNameField = document.getElementById('addNameField');
    const addDateField = document.getElementById('addDateField');
    const signTypeBtns = document.querySelectorAll('.sign-type-btn');
    const sigTabs = document.querySelectorAll('.sig-tab');
    const drawCanvas = document.getElementById('drawCanvas');
    const clearDrawing = document.getElementById('clearDrawing');
    const fullNameInput = document.getElementById('fullNameInput');
    const initialsInput = document.getElementById('initialsInput');
    const colorBtns = document.querySelectorAll('.color-btn');
    const signatureUploadZone = document.getElementById('signatureUploadZone');
    const signatureFileInput = document.getElementById('signatureFileInput');
    const uploadedSignaturePreview = document.getElementById('uploadedSignaturePreview');
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    const zoomFitBtn = document.getElementById('zoomFit');
    const zoomLevelSpan = document.getElementById('zoomLevel');

    let pdfDoc = null;
    let currentPage = 1;
    let totalPages = 0;
    let uploadedFile = null;
    let signatureData = null;
    let signatureElement = null;
    let currentTab = 'type';
    let selectedFont = 'cursive1';
    let selectedColor = '#000000';
    let isDrawing = false;
    let drawCtx = null;
    let pdfScale = 1;
    let baseScale = 1;
    let zoomFactor = 1;
    let canvasOffsetX = 0;
    let canvasOffsetY = 0;

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
        signToolLayout.style.display = 'grid';

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

    async function renderPage(pageNum, preserveZoom = false) {
        const page = await pdfDoc.getPage(pageNum);
        const container = document.getElementById('pdfCanvasContainer');
        const maxWidth = container.clientWidth - 40 || 600;
        const maxHeight = container.clientHeight - 40 || window.innerHeight * 0.7;
        
        const viewport = page.getViewport({ scale: 1 });
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

        const ctx = pdfCanvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;

        document.getElementById('signaturePage').value = pageNum;
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
        }
    }
    
    async function zoomOut() {
        if (zoomFactor > 0.5) {
            zoomFactor = Math.max(zoomFactor - 0.25, 0.5);
            updateZoomLevel();
            await renderPage(currentPage, true);
        }
    }
    
    async function zoomFit() {
        zoomFactor = 1;
        updateZoomLevel();
        await renderPage(currentPage, true);
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

    signTypeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            signTypeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    addSignatureField.addEventListener('click', () => {
        signatureModal.style.display = 'flex';
        initDrawCanvas();
    });

    closeModal.addEventListener('click', () => {
        signatureModal.style.display = 'none';
    });

    signatureModal.addEventListener('click', (e) => {
        if (e.target === signatureModal) {
            signatureModal.style.display = 'none';
        }
    });

    sigTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            sigTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTab = tab.dataset.tab;

            document.getElementById('typeTabContent').style.display = currentTab === 'type' ? 'block' : 'none';
            document.getElementById('drawTabContent').style.display = currentTab === 'draw' ? 'block' : 'none';
            document.getElementById('uploadTabContent').style.display = currentTab === 'upload' ? 'block' : 'none';

            if (currentTab === 'draw') {
                initDrawCanvas();
            }
        });
    });

    document.querySelectorAll('input[name="signatureFont"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            selectedFont = e.target.value;
        });
    });

    colorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            colorBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedColor = btn.dataset.color;
        });
    });

    function initDrawCanvas() {
        drawCtx = drawCanvas.getContext('2d');
        drawCtx.strokeStyle = selectedColor;
        drawCtx.lineWidth = 2;
        drawCtx.lineCap = 'round';
        drawCtx.lineJoin = 'round';
    }

    drawCanvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        drawCtx.beginPath();
        drawCtx.moveTo(e.offsetX, e.offsetY);
    });

    drawCanvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        drawCtx.strokeStyle = selectedColor;
        drawCtx.lineTo(e.offsetX, e.offsetY);
        drawCtx.stroke();
    });

    drawCanvas.addEventListener('mouseup', () => {
        isDrawing = false;
    });

    drawCanvas.addEventListener('mouseleave', () => {
        isDrawing = false;
    });

    drawCanvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = drawCanvas.getBoundingClientRect();
        isDrawing = true;
        drawCtx.beginPath();
        drawCtx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    });

    drawCanvas.addEventListener('touchmove', (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const touch = e.touches[0];
        const rect = drawCanvas.getBoundingClientRect();
        drawCtx.strokeStyle = selectedColor;
        drawCtx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
        drawCtx.stroke();
    });

    drawCanvas.addEventListener('touchend', () => {
        isDrawing = false;
    });

    clearDrawing.addEventListener('click', () => {
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    });

    signatureUploadZone.addEventListener('click', () => {
        signatureFileInput.click();
    });

    signatureFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const reader = new FileReader();
            reader.onload = (event) => {
                uploadedSignaturePreview.src = event.target.result;
                uploadedSignaturePreview.style.display = 'block';
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });

    applySignature.addEventListener('click', () => {
        let sigData = null;
        let sigType = 'text';

        if (currentTab === 'type') {
            const name = fullNameInput.value || 'Signature';
            sigData = {
                type: 'text',
                text: name,
                font: selectedFont,
                color: selectedColor
            };
        } else if (currentTab === 'draw') {
            sigData = {
                type: 'image',
                data: drawCanvas.toDataURL('image/png')
            };
            sigType = 'image';
        } else if (currentTab === 'upload') {
            if (uploadedSignaturePreview.src) {
                sigData = {
                    type: 'image',
                    data: uploadedSignaturePreview.src
                };
                sigType = 'image';
            }
        }

        if (sigData) {
            signatureData = sigData;
            addSignatureToOverlay(sigData);
            signatureModal.style.display = 'none';
        }
    });

    function addSignatureToOverlay(sigData) {
        if (signatureElement) {
            signatureElement.remove();
        }

        signatureElement = document.createElement('div');
        signatureElement.className = 'signature-placed';
        signatureElement.style.position = 'absolute';
        signatureElement.style.left = '50px';
        signatureElement.style.top = '50px';
        signatureElement.style.cursor = 'move';
        signatureElement.style.zIndex = '10';

        if (sigData.type === 'text') {
            signatureElement.style.fontFamily = getFontFamily(sigData.font);
            signatureElement.style.fontSize = '24px';
            signatureElement.style.color = sigData.color;
            signatureElement.textContent = sigData.text;
        } else {
            const img = document.createElement('img');
            img.src = sigData.data;
            img.style.maxWidth = '200px';
            img.style.maxHeight = '80px';
            signatureElement.appendChild(img);
        }

        const removeBtn = document.createElement('button');
        removeBtn.className = 'signature-remove-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            signatureElement.remove();
            signatureElement = null;
            signatureData = null;
        });
        signatureElement.appendChild(removeBtn);

        signatureOverlay.appendChild(signatureElement);
        makeDraggable(signatureElement);
        
        const x = signatureElement.offsetLeft / pdfScale;
        const y = signatureElement.offsetTop / pdfScale;
        document.getElementById('signatureX').value = x;
        document.getElementById('signatureY').value = y;
    }

    function getFontFamily(font) {
        const fonts = {
            'cursive1': "'Dancing Script', cursive",
            'cursive2': "'Great Vibes', cursive",
            'cursive3': "'Pacifico', cursive"
        };
        return fonts[font] || fonts['cursive1'];
    }

    function makeDraggable(element) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        element.addEventListener('mousedown', startDrag);
        element.addEventListener('touchstart', startDrag);

        function startDrag(e) {
            if (e.target.classList.contains('signature-remove-btn')) return;
            isDragging = true;
            const event = e.type === 'touchstart' ? e.touches[0] : e;
            startX = event.clientX;
            startY = event.clientY;
            initialLeft = element.offsetLeft;
            initialTop = element.offsetTop;
            
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', stopDrag);
            document.addEventListener('touchmove', drag);
            document.addEventListener('touchend', stopDrag);
        }

        function drag(e) {
            if (!isDragging) return;
            e.preventDefault();
            const event = e.type === 'touchmove' ? e.touches[0] : e;
            const dx = event.clientX - startX;
            const dy = event.clientY - startY;
            element.style.left = (initialLeft + dx) + 'px';
            element.style.top = (initialTop + dy) + 'px';
        }

        function stopDrag() {
            isDragging = false;
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', stopDrag);
            document.removeEventListener('touchmove', drag);
            document.removeEventListener('touchend', stopDrag);

            const x = element.offsetLeft / pdfScale;
            const y = element.offsetTop / pdfScale;
            document.getElementById('signatureX').value = x;
            document.getElementById('signatureY').value = y;
        }
    }

    addInitialsField.addEventListener('click', () => {
        const initials = prompt('Enter your initials:');
        if (initials) {
            addTextFieldToOverlay(initials, 'initials');
        }
    });

    addNameField.addEventListener('click', () => {
        const name = prompt('Enter your name:');
        if (name) {
            addTextFieldToOverlay(name, 'name');
        }
    });

    addDateField.addEventListener('click', () => {
        const today = new Date().toLocaleDateString();
        addTextFieldToOverlay(today, 'date');
    });

    function addTextFieldToOverlay(text, type) {
        const field = document.createElement('div');
        field.className = `field-placed field-${type}`;
        field.style.position = 'absolute';
        field.style.left = '100px';
        field.style.top = '100px';
        field.style.cursor = 'move';
        field.style.fontSize = '14px';
        field.style.padding = '4px 8px';
        field.style.background = 'rgba(255,255,255,0.9)';
        field.style.border = '1px dashed #3f51b5';
        field.textContent = text;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'signature-remove-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.addEventListener('click', () => field.remove());
        field.appendChild(removeBtn);

        signatureOverlay.appendChild(field);
        makeDraggable(field);
    }

    signForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!uploadedFile) {
            alert('Please upload a PDF file first');
            return;
        }

        if (!signatureData) {
            alert('Please add a signature first');
            return;
        }

        const formData = new FormData();
        formData.append('files', uploadedFile);
        
        let sigDataToSend = '';
        if (signatureData.type === 'text') {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            const fontSize = 36;
            const fontFamily = getFontFamily(signatureData.font);
            tempCtx.font = `${fontSize}px ${fontFamily}`;
            const textWidth = tempCtx.measureText(signatureData.text).width;
            tempCanvas.width = Math.max(textWidth + 20, 300);
            tempCanvas.height = 80;
            tempCtx.fillStyle = 'white';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.fillStyle = signatureData.color;
            tempCtx.font = `${fontSize}px ${fontFamily}`;
            tempCtx.textBaseline = 'middle';
            tempCtx.fillText(signatureData.text, 10, 40);
            sigDataToSend = tempCanvas.toDataURL('image/png');
        } else {
            sigDataToSend = signatureData.data;
        }
        
        formData.append('signature', sigDataToSend);
        document.getElementById('signatureData').value = sigDataToSend;
        
        formData.append('x', document.getElementById('signatureX').value);
        formData.append('y', document.getElementById('signatureY').value);
        formData.append('page', document.getElementById('signaturePage').value);

        const submitBtn = signForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<svg class="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none"/></svg> Processing...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/process/sign', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                signToolLayout.style.display = 'none';
                resultArea.style.display = 'block';

                downloadButtons.innerHTML = '';
                const btn = document.createElement('a');
                btn.href = `/download/${result.output_path.split('/').pop()}`;
                btn.className = 'btn btn-download';
                btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download Signed PDF`;
                downloadButtons.appendChild(btn);
            } else {
                showError(result.error || 'Failed to sign PDF');
            }
        } catch (error) {
            showError(error.message || 'An error occurred');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    function showError(message) {
        signToolLayout.style.display = 'none';
        errorArea.style.display = 'block';
        document.getElementById('errorMessage').textContent = message;
    }

    function resetTool() {
        pdfDoc = null;
        currentPage = 1;
        totalPages = 0;
        uploadedFile = null;
        signatureData = null;
        signatureElement = null;
        zoomFactor = 1;
        updateZoomLevel();

        pageThumbnails.innerHTML = '';
        signatureOverlay.innerHTML = '';
        
        signToolLayout.style.display = 'none';
        resultArea.style.display = 'none';
        errorArea.style.display = 'none';
        initialUpload.style.display = 'block';
        
        fileInput.value = '';
        fullNameInput.value = '';
        initialsInput.value = '';
        
        if (drawCtx) {
            drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        }
        uploadedSignaturePreview.src = '';
        uploadedSignaturePreview.style.display = 'none';
    }

    processAnother.addEventListener('click', resetTool);
    tryAgain.addEventListener('click', resetTool);
});
