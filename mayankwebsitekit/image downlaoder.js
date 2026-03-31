(async function() {
    // 1. Prompt for Product Name before doing anything
    const rawProductName = prompt("Enter the product name (leave blank to skip):", "");
    // Handle the case where the user clicks "Cancel" (returns null)
    const productName = rawProductName !== null ? rawProductName.trim() : "";

    // 2. Load JSZip
    if (!window.JSZip) {
        await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }

    // 3. Inject CSS for UI elements
    const style = document.createElement('style');
    style.innerHTML = `
        .custom-img-wrapper { position: relative; display: inline-block; box-sizing: border-box; transition: outline 0.2s; cursor: pointer; }
        .custom-img-wrapper:hover { outline: 3px solid #007bff; }
        .custom-img-checkbox { position: absolute; top: 8px; left: 8px; z-index: 10000; transform: scale(1.8); cursor: pointer; display: none; box-shadow: 0 0 5px rgba(0,0,0,0.5); pointer-events: none; }
        .custom-img-wrapper:hover .custom-img-checkbox, .custom-img-checkbox:checked { display: block; }
        .custom-img-input { position: absolute; bottom: 8px; left: 8px; z-index: 10000; width: calc(100% - 16px); padding: 6px; display: none; font-size: 14px; border: 2px solid #28a745; border-radius: 4px; box-shadow: 0 0 5px rgba(0,0,0,0.5); cursor: text; }
        
        #batch-dl-panel { position: fixed; bottom: 30px; right: 30px; z-index: 999999; background: white; padding: 15px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); font-family: sans-serif; display: flex; flex-direction: column; gap: 12px; border: 1px solid #ccc; width: 220px; }
        .panel-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #333; }
        #quality-slider { width: 100%; margin-top: 5px; cursor: pointer; }
        #batch-dl-btn { padding: 12px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold; transition: background 0.2s; }
        #batch-dl-btn:hover { background: #0056b3; }
        #batch-dl-btn:disabled { background: #aaa; cursor: not-allowed; }
    `;
    document.head.appendChild(style);

    // 4. Process Images on the Page
    const images = document.querySelectorAll('img');
    const selectedData = []; 

    images.forEach(img => {
        if (img.width < 40 || img.height < 40) return; 

        // Extract default name
        let defaultName = 'image';
        try {
            const url = new URL(img.src, window.location.href);
            const filename = url.pathname.split('/').pop();
            if (filename) {
                defaultName = decodeURIComponent(filename.split('.')[0]) || 'image';
            }
        } catch (e) {}

        // Combine product name and default name
        const finalDefaultName = productName ? `${productName} ${defaultName}` : defaultName;

        const wrapper = document.createElement('div');
        wrapper.className = 'custom-img-wrapper';
        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'custom-img-checkbox';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'custom-img-input';
        input.value = finalDefaultName;

        // Visual updates when checkbox state changes
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                input.style.display = 'block';
                input.focus();
                wrapper.style.outline = '3px solid #28a745';
            } else {
                input.style.display = 'none';
                wrapper.style.outline = 'none';
            }
        });

        // Click Anywhere to Select/Deselect
        wrapper.addEventListener('click', (e) => {
            // Prevent clicking the image from acting like a link
            e.preventDefault();
            e.stopPropagation();

            // Allow the user to click inside the text input to rename without toggling the checkbox
            if (e.target === input) return;

            // Toggle checkbox and manually trigger the change event
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        });

        wrapper.appendChild(checkbox);
        wrapper.appendChild(input);

        wrapper.dataset.imgSrc = img.src;
        wrapper._checkbox = checkbox;
        wrapper._input = input;
        selectedData.push(wrapper);
    });

    // 5. Create the Floating Control Panel
    const panel = document.createElement('div');
    panel.id = 'batch-dl-panel';
    panel.innerHTML = `
        <div class="panel-row">
            <label><strong>Compression Quality:</strong> <span id="quality-val">70%</span></label>
        </div>
        <input type="range" id="quality-slider" min="0.1" max="1" step="0.1" value="0.7">
        <div class="panel-row" style="font-size: 11px; color: #666;">
            (Converts to WebP. Skips GIFs)
        </div>
        <button id="batch-dl-btn">Download Selected (0)</button>
    `;
    document.body.appendChild(panel);

    const btn = document.getElementById('batch-dl-btn');
    const slider = document.getElementById('quality-slider');
    const qualityVal = document.getElementById('quality-val');

    slider.addEventListener('input', (e) => {
        qualityVal.innerText = Math.round(e.target.value * 100) + '%';
    });

    // Update button counter globally when any checkbox changes
    document.body.addEventListener('change', (e) => {
        if (e.target.classList.contains('custom-img-checkbox')) {
            const count = selectedData.filter(w => w._checkbox.checked).length;
            btn.innerText = `Download Selected (${count})`;
        }
    });

    // Compression Helper Function
    const compressImage = (blob, quality) => {
        return new Promise((resolve) => {
            if (blob.type === 'image/gif' || blob.type === 'image/svg+xml') {
                return resolve({ blob, ext: blob.type === 'image/gif' ? '.gif' : '.svg' });
            }

            const img = new Image();
            const url = URL.createObjectURL(blob);
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob((compressedBlob) => {
                    URL.revokeObjectURL(url);
                    resolve({ blob: compressedBlob || blob, ext: '.webp' }); 
                }, 'image/webp', parseFloat(quality));
            };
            
            img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve({ blob, ext: '.jpg' }); 
            };
            
            img.src = url;
        });
    };

    // 6. Handle Download Logic
    btn.addEventListener('click', async () => {
        const selectedWrappers = selectedData.filter(w => w._checkbox.checked);
        if (selectedWrappers.length === 0) {
            alert('Please select at least one image first!');
            return;
        }

        btn.disabled = true;
        btn.innerText = 'Processing...';
        btn.style.background = '#28a745';
        
        const zip = new JSZip();
        const imgFolder = zip.folder("img");
        const fileNames = [];
        const quality = slider.value;

        for (let i = 0; i < selectedWrappers.length; i++) {
            const w = selectedWrappers[i];
            const src = w.dataset.imgSrc;
            
            let customName = w._input.value.trim().replace(/[\\/:*?"<>|]/g, "") || `image_${i+1}`;

            try {
                const response = await fetch(src);
                const originalBlob = await response.blob();
                
                const { blob: finalBlob, ext } = await compressImage(originalBlob, quality);
                const finalName = customName + ext;
                
                imgFolder.file(finalName, finalBlob);
                fileNames.push(finalName);
            } catch (err) {
                console.warn('Failed to download/compress: ' + src, err);
            }
        }

        if (fileNames.length === 0) {
            alert('Failed. The website likely blocks cross-origin downloads (CORS).');
            btn.disabled = false;
            btn.innerText = `Download Selected (${selectedWrappers.length})`;
            btn.style.background = '#007bff';
            return;
        }

        btn.innerText = 'Zipping...';
        const content = await zip.generateAsync({ type: "blob" });

        const a = document.createElement('a');
        a.href = URL.createObjectURL(content);
        a.download = "compressed_images.zip";
        a.click();
        URL.revokeObjectURL(a.href);

        const clipboardText = fileNames.join('\n');
        try {
            await navigator.clipboard.writeText(clipboardText);
            alert('Success! ZIP downloaded, compressed, and filenames copied to clipboard.');
        } catch (err) {
            alert('ZIP downloaded successfully! (Browser blocked clipboard copy)');
        }

        btn.disabled = false;
        btn.innerText = `Download Selected (${selectedWrappers.length})`;
        btn.style.background = '#007bff';
    });

    console.log("✅ Advanced Image Tool activated!");
})();