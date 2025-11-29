// Cache for per-pixel hit-testing
const imageHitmapCache = new Map();

export function processBasePony(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = src;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');

            // Draw image
            ctx.drawImage(img, 0, 0);

            // Get data
            const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = frame.data;

            // Simple grey removal logic
            const br = data[0];
            const bg = data[1];
            const bb = data[2];

            // Tolerance
            const t = 20; 

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                if (Math.abs(r - br) < t && Math.abs(g - bg) < t && Math.abs(b - bb) < t) {
                    data[i + 3] = 0; // Set alpha to 0
                }
            }

            ctx.putImageData(frame, 0, 0);
            resolve(canvas.toDataURL());
        };
        img.onerror = reject;
    });
}

export function prepareHitmap(src) {
    if (imageHitmapCache.has(src) && imageHitmapCache.get(src).data) {
        return Promise.resolve(imageHitmapCache.get(src));
    }

    if (imageHitmapCache.has(src) && imageHitmapCache.get(src).promise) {
        return imageHitmapCache.get(src).promise;
    }

    const promise = new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = src;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            const hitmap = {
                width: canvas.width,
                height: canvas.height,
                data: imageData.data
            };
            imageHitmapCache.set(src, hitmap);
            resolve(hitmap);
        };
        img.onerror = (err) => {
            console.error('Failed to prepare hitmap for', src, err);
            const hitmap = { width: 0, height: 0, data: null };
            imageHitmapCache.set(src, hitmap);
            resolve(hitmap);
        };
    });

    imageHitmapCache.set(src, { promise });
    return promise;
}

export function isOpaqueAtElement(el, clientX, clientY) {
    const src = el.src;
    const hitmap = imageHitmapCache.get(src);

    if (!hitmap || !hitmap.data) {
        return false;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;

    let x = ((clientX - rect.left) / rect.width) * hitmap.width;
    let y = ((clientY - rect.top) / rect.height) * hitmap.height;

    x = Math.floor(x);
    y = Math.floor(y);

    if (x < 0 || y < 0 || x >= hitmap.width || y >= hitmap.height) {
        return false;
    }

    if (el.dataset.flip === 'true') {
        x = hitmap.width - 1 - x;
    }

    const idx = (y * hitmap.width + x) * 4 + 3; // alpha channel
    const alpha = hitmap.data[idx];

    return alpha > 10;
}

export function pickUnderlyingOpaqueStageItem(excludeEl, clientX, clientY) {
    const elements = document.elementsFromPoint(clientX, clientY);
    for (const el of elements) {
        if (
            el !== excludeEl &&
            el.classList &&
            el.classList.contains('stage-item') &&
            el.dataset.isBack !== 'true' &&
            isOpaqueAtElement(el, clientX, clientY)
        ) {
            return el;
        }
    }
    return null;
}