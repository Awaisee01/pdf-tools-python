document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const dropzone = document.getElementById('dropzone');
    const initialUpload = document.getElementById('initialUpload');
    const splitToolLayout = document.getElementById('splitToolLayout');
    const pageThumbnails = document.getElementById('pageThumbnails');
    const rangePreviewContainer = document.getElementById('rangePreviewContainer');
    const rangesList = document.getElementById('rangesList');
    const addRangeBtn = document.getElementById('addRangeBtn');
    const splitForm = document.getElementById('splitForm');
    const resultArea = document.getElementById('resultArea');
    const errorArea = document.getElementById('errorArea');
    const downloadButtons = document.getElementById('downloadButtons');
    const processAnother = document.getElementById('processAnother');
    const tryAgain = document.getElementById('tryAgain');
    const modeTabs = document.querySelectorAll('.mode-tab');
    const rangeModeContent = document.getElementById('rangeModeContent');
    const pagesModeContent = document.getElementById('pagesModeContent');
    const pagesSelection = document.getElementById('pagesSelection');
    const rangeTypeButtons = document.querySelectorAll('.range-type-btn');

    let pdfDoc = null;
    let totalPages = 0;
    let uploadedFile = null;
    let rangeCount = 1;
    let selectedPages = new Set();
    let currentMode = 'range';
    let thumbnailCache = new Map();

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
        selectedPages.clear();
        thumbnailCache.clear();
        const arrayBuffer = await file.arrayBuffer();
        pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        totalPages = pdfDoc.numPages;

        initialUpload.style.display = 'none';
        splitToolLayout.style.display = 'grid';

        await renderThumbnails();
        initializeRanges();
        initializePagesSelection();
    }

    async function renderThumbnails() {
        pageThumbnails.innerHTML = '';
        for (let i = 1; i <= totalPages; i++) {
            const page = await pdfDoc.getPage(i);
            const scale = 0.3;
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport }).promise;

            const thumbWrapper = document.createElement('div');
            thumbWrapper.className = 'page-thumbnail';
            thumbWrapper.dataset.page = i;

            const pageNum = document.createElement('span');
            pageNum.className = 'page-num';
            pageNum.textContent = i;

            thumbWrapper.appendChild(canvas);
            thumbWrapper.appendChild(pageNum);
            pageThumbnails.appendChild(thumbWrapper);
        }
    }

    function initializeRanges() {
        const rangeItem = rangesList.querySelector('.range-item');
        if (rangeItem) {
            rangeItem.querySelector('.range-to').value = totalPages;
            rangeItem.querySelector('.range-to').max = totalPages;
            rangeItem.querySelector('.range-from').max = totalPages;
        }
        updateRangePreview();
    }

    function initializePagesSelection() {
        pagesSelection.innerHTML = '';
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.type = 'button';
            pageBtn.className = 'page-select-btn';
            pageBtn.textContent = i;
            pageBtn.dataset.page = i;
            pageBtn.addEventListener('click', () => togglePageSelection(pageBtn, i));
            pagesSelection.appendChild(pageBtn);
        }
    }

    function togglePageSelection(btn, pageNum) {
        if (selectedPages.has(pageNum)) {
            selectedPages.delete(pageNum);
            btn.classList.remove('selected');
        } else {
            selectedPages.add(pageNum);
            btn.classList.add('selected');
        }
    }

    modeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            modeTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentMode = tab.dataset.mode;

            if (currentMode === 'range') {
                rangeModeContent.style.display = 'block';
                pagesModeContent.style.display = 'none';
                document.getElementById('splitType').value = 'range';
            } else {
                rangeModeContent.style.display = 'none';
                pagesModeContent.style.display = 'block';
                document.getElementById('splitType').value = 'pages';
            }
        });
    });

    rangeTypeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            rangeTypeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    addRangeBtn.addEventListener('click', addNewRange);

    function addNewRange() {
        rangeCount++;
        const rangeItem = document.createElement('div');
        rangeItem.className = 'range-item';
        rangeItem.dataset.range = rangeCount;
        rangeItem.innerHTML = `
            <div class="range-header">
                <span class="range-drag-handle">&#8661;</span>
                <span>Range ${rangeCount}</span>
                <button type="button" class="range-delete-btn" title="Delete range">&times;</button>
            </div>
            <div class="range-inputs">
                <div class="range-input-group">
                    <label>from page</label>
                    <input type="number" class="range-from" value="1" min="1" max="${totalPages}">
                </div>
                <div class="range-input-group">
                    <label>to</label>
                    <input type="number" class="range-to" value="${totalPages}" min="1" max="${totalPages}">
                </div>
            </div>
        `;
        rangesList.appendChild(rangeItem);

        rangeItem.querySelector('.range-delete-btn').addEventListener('click', () => {
            rangeItem.remove();
            updateRangePreview();
        });

        rangeItem.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', updateRangePreview);
        });

        const rangeGroup = document.createElement('div');
        rangeGroup.className = 'range-group';
        rangeGroup.dataset.range = rangeCount;
        rangeGroup.innerHTML = `
            <div class="range-label">Range ${rangeCount}</div>
            <div class="range-pages" id="rangePages${rangeCount}"></div>
        `;
        rangePreviewContainer.appendChild(rangeGroup);

        updateRangePreview();
    }

    rangesList.querySelectorAll('.range-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const rangeItem = e.target.closest('.range-item');
            const rangeNum = rangeItem.dataset.range;
            rangeItem.remove();
            const rangeGroup = rangePreviewContainer.querySelector(`[data-range="${rangeNum}"]`);
            if (rangeGroup) rangeGroup.remove();
            updateRangePreview();
        });
    });

    rangesList.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', updateRangePreview);
    });

    async function updateRangePreview() {
        const rangeItems = rangesList.querySelectorAll('.range-item');
        const activeRangeNums = new Set();
        
        for (const rangeItem of rangeItems) {
            activeRangeNums.add(rangeItem.dataset.range);
        }
        
        rangePreviewContainer.querySelectorAll('.range-group').forEach(group => {
            if (!activeRangeNums.has(group.dataset.range)) {
                group.remove();
            }
        });
        
        for (const rangeItem of rangeItems) {
            const rangeNum = rangeItem.dataset.range;
            const fromPage = parseInt(rangeItem.querySelector('.range-from').value) || 1;
            const toPage = parseInt(rangeItem.querySelector('.range-to').value) || totalPages;
            
            let rangeGroup = rangePreviewContainer.querySelector(`[data-range="${rangeNum}"]`);
            if (!rangeGroup) {
                rangeGroup = document.createElement('div');
                rangeGroup.className = 'range-group';
                rangeGroup.dataset.range = rangeNum;
                rangeGroup.innerHTML = `
                    <div class="range-label">Range ${rangeNum}</div>
                    <div class="range-pages" id="rangePages${rangeNum}"></div>
                `;
                rangePreviewContainer.appendChild(rangeGroup);
            }

            const rangePagesContainer = rangeGroup.querySelector('.range-pages');
            rangePagesContainer.innerHTML = '';

            for (let i = fromPage; i <= toPage && i <= totalPages; i++) {
                let cachedThumb = thumbnailCache.get(i);
                if (!cachedThumb) {
                    const page = await pdfDoc.getPage(i);
                    const scale = 0.2;
                    const viewport = page.getViewport({ scale });

                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;

                    const ctx = canvas.getContext('2d');
                    await page.render({ canvasContext: ctx, viewport }).promise;
                    cachedThumb = canvas.toDataURL();
                    thumbnailCache.set(i, cachedThumb);
                }

                const pageWrapper = document.createElement('div');
                pageWrapper.className = 'range-page-thumb';
                
                const img = document.createElement('img');
                img.src = cachedThumb;
                
                const pageNum = document.createElement('span');
                pageNum.className = 'range-page-num';
                pageNum.textContent = i;

                pageWrapper.appendChild(img);
                pageWrapper.appendChild(pageNum);
                rangePagesContainer.appendChild(pageWrapper);
            }
        }
    }

    splitForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!uploadedFile) {
            alert('Please upload a PDF file first');
            return;
        }

        const formData = new FormData();
        formData.append('files', uploadedFile);
        formData.append('split_type', currentMode);

        if (currentMode === 'range') {
            const ranges = [];
            rangesList.querySelectorAll('.range-item').forEach(item => {
                const from = item.querySelector('.range-from').value;
                const to = item.querySelector('.range-to').value;
                ranges.push(`${from}-${to}`);
            });
            const rangesStr = ranges.join(',');
            formData.append('ranges', rangesStr);
            formData.append('pages', rangesStr);
            formData.append('merge', document.getElementById('mergeRanges').checked);
            document.getElementById('rangesData').value = rangesStr;
        } else {
            const pagesStr = Array.from(selectedPages).sort((a, b) => a - b).join(',');
            formData.append('pages', pagesStr);
            document.getElementById('selectedPages').value = pagesStr;
        }
        document.getElementById('splitType').value = currentMode;

        const submitBtn = splitForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<svg class="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none"/></svg> Processing...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/process/split', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                splitToolLayout.style.display = 'none';
                resultArea.style.display = 'block';
                
                downloadButtons.innerHTML = '';
                if (result.files) {
                    result.files.forEach((file, index) => {
                        const btn = document.createElement('a');
                        btn.href = `/download/${file}`;
                        btn.className = 'btn btn-download';
                        btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download Part ${index + 1}`;
                        downloadButtons.appendChild(btn);
                    });
                } else if (result.folder) {
                    const btn = document.createElement('a');
                    btn.href = `/download-folder/${result.folder}`;
                    btn.className = 'btn btn-download';
                    btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download All (ZIP)`;
                    downloadButtons.appendChild(btn);
                }
            } else {
                showError(result.error || 'Failed to split PDF');
            }
        } catch (error) {
            showError(error.message || 'An error occurred');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    function showError(message) {
        splitToolLayout.style.display = 'none';
        errorArea.style.display = 'block';
        document.getElementById('errorMessage').textContent = message;
    }

    function resetTool() {
        pdfDoc = null;
        totalPages = 0;
        uploadedFile = null;
        rangeCount = 1;
        selectedPages.clear();
        currentMode = 'range';
        
        pageThumbnails.innerHTML = '';
        rangePreviewContainer.innerHTML = `
            <div class="range-group active" data-range="1">
                <div class="range-label">Range 1</div>
                <div class="range-pages" id="rangePages1"></div>
            </div>
        `;
        rangesList.innerHTML = `
            <div class="range-item" data-range="1">
                <div class="range-header">
                    <span class="range-drag-handle">&#8661;</span>
                    <span>Range 1</span>
                    <button type="button" class="range-delete-btn" title="Delete range">&times;</button>
                </div>
                <div class="range-inputs">
                    <div class="range-input-group">
                        <label>from page</label>
                        <input type="number" class="range-from" value="1" min="1">
                    </div>
                    <div class="range-input-group">
                        <label>to</label>
                        <input type="number" class="range-to" value="1" min="1">
                    </div>
                </div>
            </div>
        `;
        pagesSelection.innerHTML = '';
        
        splitToolLayout.style.display = 'none';
        resultArea.style.display = 'none';
        errorArea.style.display = 'none';
        initialUpload.style.display = 'block';
        
        fileInput.value = '';
    }

    processAnother.addEventListener('click', resetTool);
    tryAgain.addEventListener('click', resetTool);
});
