document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    const addMoreInput = document.getElementById('addMoreInput');
    const browseBtn = document.getElementById('browseBtn');
    const dropzone = document.getElementById('dropzone');
    const initialUpload = document.getElementById('initialUpload');
    const rotateToolLayout = document.getElementById('rotateToolLayout');
    const rotatePagesGrid = document.getElementById('rotatePagesGrid');
    const rotateForm = document.getElementById('rotateForm');
    const rotationsInput = document.getElementById('rotationsInput');
    const resultArea = document.getElementById('resultArea');
    const errorArea = document.getElementById('errorArea');
    const downloadButtons = document.getElementById('downloadButtons');
    const processAnother = document.getElementById('processAnother');
    const tryAgain = document.getElementById('tryAgain');
    const resetRotation = document.getElementById('resetRotation');
    const rotateRightBtn = document.getElementById('rotateRightBtn');
    const rotateLeftBtn = document.getElementById('rotateLeftBtn');
    const addMoreBtn = document.getElementById('addMoreBtn');

    let pdfDoc = null;
    let uploadedFile = null;
    let pageRotations = {};
    let selectedPages = new Set();

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

    addMoreBtn.addEventListener('click', () => addMoreInput.click());

    async function handleFile(file) {
        uploadedFile = file;
        const arrayBuffer = await file.arrayBuffer();
        pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        initialUpload.style.display = 'none';
        rotateToolLayout.style.display = 'grid';

        pageRotations = {};
        selectedPages.clear();
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            pageRotations[i] = 0;
        }

        await renderAllPages();
        updateRotationsInput();
    }

    async function renderAllPages() {
        rotatePagesGrid.innerHTML = '';

        for (let i = 1; i <= pdfDoc.numPages; i++) {
            const pageContainer = document.createElement('div');
            pageContainer.className = 'rotate-page-item';
            pageContainer.dataset.page = i;

            const thumbnailWrapper = document.createElement('div');
            thumbnailWrapper.className = 'rotate-thumbnail-wrapper';

            const canvas = document.createElement('canvas');
            canvas.className = 'rotate-page-canvas';

            const rotateOverlay = document.createElement('div');
            rotateOverlay.className = 'rotate-overlay-controls';
            rotateOverlay.innerHTML = `
                <button type="button" class="rotate-arrow rotate-left" data-page="${i}" data-direction="left" title="Rotate left">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 4v6h6"></path>
                        <path d="M3.51 15a9 9 0 1 0 2.12-9.36L1 10"></path>
                    </svg>
                </button>
                <button type="button" class="rotate-arrow rotate-right" data-page="${i}" data-direction="right" title="Rotate right">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M23 4v6h-6"></path>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                </button>
            `;

            const pageNumber = document.createElement('div');
            pageNumber.className = 'rotate-page-number';
            pageNumber.textContent = i;

            const pageLabel = document.createElement('div');
            pageLabel.className = 'rotate-page-label';
            pageLabel.textContent = `${uploadedFile.name.substring(0, 20)}${uploadedFile.name.length > 20 ? '...' : ''}`;

            thumbnailWrapper.appendChild(canvas);
            thumbnailWrapper.appendChild(rotateOverlay);
            thumbnailWrapper.appendChild(pageNumber);
            pageContainer.appendChild(thumbnailWrapper);
            pageContainer.appendChild(pageLabel);
            rotatePagesGrid.appendChild(pageContainer);

            await renderPageThumbnail(i, canvas);

            pageContainer.addEventListener('click', (e) => {
                if (!e.target.closest('.rotate-arrow')) {
                    togglePageSelection(i, pageContainer);
                }
            });
        }

        document.querySelectorAll('.rotate-arrow').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const page = parseInt(btn.dataset.page);
                const direction = btn.dataset.direction;
                rotatePage(page, direction);
            });
        });
    }

    async function renderPageThumbnail(pageNum, canvas) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 0.3 });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        applyRotationToCanvas(pageNum, canvas);
    }

    function applyRotationToCanvas(pageNum, canvas) {
        const rotation = pageRotations[pageNum] || 0;
        canvas.style.transform = `rotate(${rotation}deg)`;
    }

    function togglePageSelection(pageNum, container) {
        if (selectedPages.has(pageNum)) {
            selectedPages.delete(pageNum);
            container.classList.remove('selected');
        } else {
            selectedPages.add(pageNum);
            container.classList.add('selected');
        }
    }

    function rotatePage(pageNum, direction) {
        const delta = direction === 'right' ? 90 : -90;
        pageRotations[pageNum] = ((pageRotations[pageNum] || 0) + delta + 360) % 360;

        const canvas = document.querySelector(`.rotate-page-item[data-page="${pageNum}"] .rotate-page-canvas`);
        if (canvas) {
            applyRotationToCanvas(pageNum, canvas);
        }

        updateRotationsInput();
    }

    function rotateSelectedPages(direction) {
        const pagesToRotate = selectedPages.size > 0 ? Array.from(selectedPages) : Object.keys(pageRotations).map(Number);
        
        pagesToRotate.forEach(pageNum => {
            rotatePage(pageNum, direction);
        });
    }

    rotateRightBtn.addEventListener('click', () => rotateSelectedPages('right'));
    rotateLeftBtn.addEventListener('click', () => rotateSelectedPages('left'));

    resetRotation.addEventListener('click', (e) => {
        e.preventDefault();
        for (let pageNum in pageRotations) {
            pageRotations[pageNum] = 0;
            const canvas = document.querySelector(`.rotate-page-item[data-page="${pageNum}"] .rotate-page-canvas`);
            if (canvas) {
                canvas.style.transform = 'rotate(0deg)';
            }
        }
        selectedPages.clear();
        document.querySelectorAll('.rotate-page-item.selected').forEach(el => el.classList.remove('selected'));
        updateRotationsInput();
    });

    function updateRotationsInput() {
        rotationsInput.value = JSON.stringify(pageRotations);
    }

    rotateForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!uploadedFile) {
            alert('Please upload a PDF file first');
            return;
        }

        const hasRotation = Object.values(pageRotations).some(r => r !== 0);
        if (!hasRotation) {
            alert('Please rotate at least one page');
            return;
        }

        const formData = new FormData();
        formData.append('files', uploadedFile);
        
        const nonZeroRotations = {};
        for (let page in pageRotations) {
            if (pageRotations[page] !== 0) {
                nonZeroRotations[page] = pageRotations[page];
            }
        }
        formData.append('rotations', JSON.stringify(nonZeroRotations));

        const submitBtn = rotateForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<svg class="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none"/></svg> Processing...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/process/rotate', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                rotateToolLayout.style.display = 'none';
                resultArea.style.display = 'block';

                downloadButtons.innerHTML = '';
                const btn = document.createElement('a');
                btn.href = `/download/${result.output_path.split('/').pop()}`;
                btn.className = 'btn btn-download';
                btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download Rotated PDF`;
                downloadButtons.appendChild(btn);
            } else {
                showError(result.error || 'Failed to rotate PDF');
            }
        } catch (error) {
            showError(error.message || 'An error occurred');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    function showError(message) {
        rotateToolLayout.style.display = 'none';
        errorArea.style.display = 'block';
        document.getElementById('errorMessage').textContent = message;
    }

    function resetTool() {
        pdfDoc = null;
        uploadedFile = null;
        pageRotations = {};
        selectedPages.clear();

        rotateToolLayout.style.display = 'none';
        resultArea.style.display = 'none';
        errorArea.style.display = 'none';
        initialUpload.style.display = 'block';

        fileInput.value = '';
        rotatePagesGrid.innerHTML = '';
    }

    processAnother.addEventListener('click', resetTool);
    tryAgain.addEventListener('click', resetTool);
});
