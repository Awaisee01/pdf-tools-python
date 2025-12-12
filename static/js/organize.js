document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const dropzone = document.getElementById('dropzone');
    const initialUpload = document.getElementById('initialUpload');
    const organizeLayout = document.getElementById('organizeLayout');
    const pagesGrid = document.getElementById('pagesGrid');
    const organizeForm = document.getElementById('organizeForm');
    const pageOrder = document.getElementById('pageOrder');
    const fileName = document.getElementById('fileName');
    const pageCount = document.getElementById('pageCount');
    const resultArea = document.getElementById('resultArea');
    const errorArea = document.getElementById('errorArea');
    const downloadButtons = document.getElementById('downloadButtons');
    const processAnother = document.getElementById('processAnother');
    const tryAgain = document.getElementById('tryAgain');
    const resetOrder = document.getElementById('resetOrder');
    const addBlankPage = document.getElementById('addBlankPage');
    const sortAsc = document.getElementById('sortAsc');
    const sortDesc = document.getElementById('sortDesc');

    let pdfDoc = null;
    let uploadedFile = null;
    let pages = [];
    let originalOrder = [];
    let draggedItem = null;
    let blankPageCount = 0;

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
        fileName.textContent = file.name;
        
        const arrayBuffer = await file.arrayBuffer();
        pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        pages = [];
        originalOrder = [];
        blankPageCount = 0;
        
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            pages.push({ type: 'page', pageNum: i, id: `page-${i}` });
            originalOrder.push(i);
        }
        
        pageCount.textContent = pages.length;
        
        initialUpload.style.display = 'none';
        organizeLayout.style.display = 'grid';
        
        await renderPages();
        updatePageOrder();
    }

    async function renderPages() {
        pagesGrid.innerHTML = '';
        
        for (let i = 0; i < pages.length; i++) {
            const pageData = pages[i];
            const pageCard = document.createElement('div');
            pageCard.className = 'page-card';
            pageCard.draggable = true;
            pageCard.dataset.index = i;
            pageCard.dataset.id = pageData.id;
            
            const canvas = document.createElement('canvas');
            canvas.className = 'page-thumbnail-canvas';
            
            if (pageData.type === 'page') {
                const page = await pdfDoc.getPage(pageData.pageNum);
                const viewport = page.getViewport({ scale: 0.3 });
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');
                await page.render({ canvasContext: ctx, viewport }).promise;
            } else {
                canvas.width = 150;
                canvas.height = 200;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.strokeStyle = '#ddd';
                ctx.strokeRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#999';
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Blank Page', canvas.width / 2, canvas.height / 2);
            }
            
            const pageNum = document.createElement('div');
            pageNum.className = 'page-number';
            pageNum.textContent = i + 1;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'page-delete-btn';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.title = 'Remove page';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removePage(i);
            });
            
            pageCard.appendChild(canvas);
            pageCard.appendChild(pageNum);
            pageCard.appendChild(deleteBtn);
            
            pageCard.addEventListener('dragstart', handleDragStart);
            pageCard.addEventListener('dragend', handleDragEnd);
            pageCard.addEventListener('dragover', handleDragOver);
            pageCard.addEventListener('drop', handleDrop);
            pageCard.addEventListener('dragenter', handleDragEnter);
            pageCard.addEventListener('dragleave', handleDragLeave);
            
            pagesGrid.appendChild(pageCard);
        }
    }

    function handleDragStart(e) {
        draggedItem = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.dataset.index);
    }

    function handleDragEnd(e) {
        this.classList.remove('dragging');
        document.querySelectorAll('.page-card').forEach(card => {
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

    function handleDragLeave(e) {
        this.classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.preventDefault();
        this.classList.remove('drag-over');
        
        if (draggedItem && this !== draggedItem) {
            const fromIndex = parseInt(draggedItem.dataset.index);
            const toIndex = parseInt(this.dataset.index);
            
            const movedPage = pages.splice(fromIndex, 1)[0];
            pages.splice(toIndex, 0, movedPage);
            
            renderPages();
            updatePageOrder();
        }
    }

    function removePage(index) {
        if (pages.length <= 1) {
            alert('Cannot remove the last page');
            return;
        }
        pages.splice(index, 1);
        pageCount.textContent = pages.length;
        renderPages();
        updatePageOrder();
    }

    function updatePageOrder() {
        const order = pages.map(p => {
            if (p.type === 'blank') {
                return 'blank';
            }
            return p.pageNum;
        }).join(',');
        pageOrder.value = order;
    }

    addBlankPage.addEventListener('click', () => {
        blankPageCount++;
        pages.push({ type: 'blank', id: `blank-${blankPageCount}` });
        pageCount.textContent = pages.length;
        renderPages();
        updatePageOrder();
    });

    sortAsc.addEventListener('click', () => {
        pages.sort((a, b) => {
            if (a.type === 'blank' && b.type === 'blank') return 0;
            if (a.type === 'blank') return 1;
            if (b.type === 'blank') return -1;
            return a.pageNum - b.pageNum;
        });
        renderPages();
        updatePageOrder();
    });

    sortDesc.addEventListener('click', () => {
        pages.sort((a, b) => {
            if (a.type === 'blank' && b.type === 'blank') return 0;
            if (a.type === 'blank') return 1;
            if (b.type === 'blank') return -1;
            return b.pageNum - a.pageNum;
        });
        renderPages();
        updatePageOrder();
    });

    resetOrder.addEventListener('click', async () => {
        pages = [];
        blankPageCount = 0;
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            pages.push({ type: 'page', pageNum: i, id: `page-${i}` });
        }
        pageCount.textContent = pages.length;
        await renderPages();
        updatePageOrder();
    });

    organizeForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!uploadedFile) {
            alert('Please upload a PDF file first');
            return;
        }

        const formData = new FormData();
        formData.append('files', uploadedFile);
        formData.append('order', pageOrder.value);

        const submitBtn = organizeForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<svg class="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none"/></svg> Processing...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/process/organize', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                organizeLayout.style.display = 'none';
                resultArea.style.display = 'block';

                downloadButtons.innerHTML = '';
                const btn = document.createElement('a');
                btn.href = `/download/${result.filename}`;
                btn.className = 'btn btn-download';
                btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download Organized PDF`;
                downloadButtons.appendChild(btn);
            } else {
                showError(result.error || 'Failed to organize PDF');
            }
        } catch (error) {
            showError(error.message || 'An error occurred');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    function showError(message) {
        organizeLayout.style.display = 'none';
        errorArea.style.display = 'block';
        document.getElementById('errorMessage').textContent = message;
    }

    function resetTool() {
        pdfDoc = null;
        uploadedFile = null;
        pages = [];
        originalOrder = [];
        blankPageCount = 0;
        
        pagesGrid.innerHTML = '';
        
        organizeLayout.style.display = 'none';
        resultArea.style.display = 'none';
        errorArea.style.display = 'none';
        initialUpload.style.display = 'block';
        
        fileInput.value = '';
    }

    processAnother.addEventListener('click', resetTool);
    tryAgain.addEventListener('click', resetTool);
});
