const FFmpegClass = globalThis.FFmpegWASM?.FFmpeg;
const ffmpeg = FFmpegClass ? new FFmpegClass() : null;
let ffmpegLoaded = false;
let ffmpegListenersBound = false;
let ffmpegRecentLogs = [];
let ffmpegTerminatedByTimeout = false;
let ffmpegLastActivityAt = 0;

function t(key, vars = {}, fallback = '') {
    return globalThis.i18n?.t?.(key, vars, fallback || key) || fallback || key;
}

function logExportStep(label, details) {
    if (details === undefined) {
        console.log(`[export] ${label}`);
        return;
    }
    console.log(`[export] ${label}`, details);
}

function createTimeoutError(message) {
    const error = new Error(message);
    error.code = 'EXPORT_TIMEOUT';
    return error;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let exportProgressState = {
    startPct: 0,
    endPct: 100,
    label: t('export.render', {}, 'Рендер'),
    progressBar: null,
    progressText: null
};

/**
 * =========================================================
 * CONFIG
 * =========================================================
 */
const EXPORT_CONFIG = {
    maxLongSide: 1920,
    maxFps: 30,
    videoCrf: 20,
    preset: 'ultrafast',
    videoThreads: 1,
    audioSampleRate: 44100,
    audioBitrate: '128k',
    outputFileName: 'final-vigu.mp4',
    hdrMode: 'slow',
    ffmpegExecTimeoutMs: 180000,
    finalAssemblyInactivityTimeoutMs: 180000
};

const EXPORT_QUALITY_OPTIONS = [
    { value: 256, label: '144p' },
    { value: 426, label: '240p' },
    { value: 640, label: '360p' },
    { value: 854, label: '480p' },
    { value: 1280, label: '720p' },
    { value: 1920, label: '1080p' },
    { value: 2560, label: '1440p' },
    { value: 3840, label: '4K' }
];

/**
 * =========================================================
 * FFmpeg boot
 * =========================================================
 */

function getFfmpegCoreUrls() {
    const base = new URL('ffmpeg/', document.baseURI).href;
    return {
        coreURL: `${base}ffmpeg-core.js`,
        wasmURL: `${base}ffmpeg-core.wasm`,
        workerURL: `${base}ffmpeg-core.worker.js`
    };
}

function getTimelineLayers() {
    return Array.isArray(globalThis.layers) ? globalThis.layers : [];
}

function hasTimelineTracks() {
    return getTimelineLayers().some(layer => Array.isArray(layer?.tracks) && layer.tracks.length > 0);
}

function assertFfmpegEnvironment() {
    if (!ffmpeg) {
        throw new Error(t('export.ffmpegNotInitialized', {}, 'FFmpeg не инициализирован. Проверь подключение файла ffmpeg/ffmpeg.js.'));
    }
    if (typeof SharedArrayBuffer === 'undefined' || !globalThis.crossOriginIsolated) {
        throw new Error(t('export.ffmpegIsolation', {}, 'FFmpeg требует cross-origin isolation. Открой проект через localhost/https и дождись перезагрузки страницы после регистрации COI service worker.'));
    }
}

async function fetchFile(file) {
    if (typeof file === 'undefined' || file === null) {
        return new Uint8Array();
    }

    if (typeof file === 'string') {
        if (/^data:.*;base64,/.test(file)) {
            const base64 = file.split(',')[1] || '';
            return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        }

        const response = await fetch(file);
        return new Uint8Array(await response.arrayBuffer());
    }

    if (file instanceof URL) {
        const response = await fetch(file);
        return new Uint8Array(await response.arrayBuffer());
    }

    if (file instanceof File || file instanceof Blob) {
        return new Uint8Array(await file.arrayBuffer());
    }

    return new Uint8Array();
}

function bindFfmpegListeners(progressBar, progressText) {
    if (ffmpegListenersBound) return;

    ffmpeg.on('log', ({ message }) => {
        ffmpegLastActivityAt = Date.now();
        ffmpegRecentLogs.push(String(message || ''));
        if (ffmpegRecentLogs.length > 100) {
            ffmpegRecentLogs = ffmpegRecentLogs.slice(-100);
        }
        console.debug('[ffmpeg]', message);
    });

    ffmpeg.on('progress', ({ progress }) => {
        ffmpegLastActivityAt = Date.now();
        const localPct = Math.max(0, Math.min(100, Math.round(progress * 100)));
        const span = exportProgressState.endPct - exportProgressState.startPct;
        const globalPct = exportProgressState.startPct + span * (localPct / 100);

        setExportProgress(
            exportProgressState.progressBar,
            exportProgressState.progressText,
            globalPct,
            `${exportProgressState.label} ${localPct}%`
        );
    });

    ffmpegListenersBound = true;
}

function resetRecentFfmpegLogs() {
    ffmpegRecentLogs = [];
    ffmpegLastActivityAt = Date.now();
}

function hasRecentFfmpegLog(pattern) {
    return ffmpegRecentLogs.some(message => message.includes(pattern));
}

async function ensureFFmpegLoaded(progressBar, progressText) {
    bindFfmpegListeners(progressBar, progressText);

    if (ffmpegLoaded) return;
    assertFfmpegEnvironment();

    if (ffmpegTerminatedByTimeout) {
        logExportStep('Reloading FFmpeg after timeout');
        ffmpegTerminatedByTimeout = false;
    }

    const { coreURL, wasmURL, workerURL } = getFfmpegCoreUrls();

    await ffmpeg.load({
        coreURL,
        wasmURL,
        workerURL
    });

    ffmpegLoaded = true;
}

/**
 * =========================================================
 * HELPERS
 * =========================================================
 */

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function getTrackMime(track) {
    return (track?.source?.file?.type || '').toLowerCase();
}

function hasFileObject(track) {
    return !!track?.source?.file && typeof track.source.file.arrayBuffer === 'function';
}

function isImageTrack(track) {
    const mime = getTrackMime(track);
    if (mime.startsWith('image/')) return true;

    const url = String(track?.source?.url || '').toLowerCase();
    return /\.(png|jpe?g|webp|bmp|gif)$/i.test(url);
}

function isVideoTrack(track) {
    const mime = getTrackMime(track);
    if (mime.startsWith('video/')) return true;

    const url = String(track?.source?.url || '').toLowerCase();
    return /\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(url);
}

function getTrackStart(track) {
    return safeNumber(track?.start, 0);
}

function getTrackTrimStart(track) {
    return safeNumber(track?.trimStart, 0);
}

function getTrackTrimEnd(track) {
    return safeNumber(track?.trimEnd, 0);
}

function getTrackSourceLength(track) {
    return safeNumber(track?.source?.length, 0);
}

function getTrimmedDuration(track) {
    const trimStart = getTrackTrimStart(track);
    const trimEnd = getTrackTrimEnd(track);
    const sourceLength = getTrackSourceLength(track);

    if (trimEnd > trimStart) return trimEnd - trimStart;
    if (sourceLength > 0) return Math.max(0, sourceLength - trimStart);

    return 5;
}

function getTrackEnd(track) {
    return getTrackStart(track) + getTrimmedDuration(track);
}

function setExportProgress(progressBar, progressText, pct, label = '') {
    const normalizedPct = Math.max(0, Math.min(100, Math.round(pct)));
    if (progressBar) {
        progressBar.style.width = `${normalizedPct}%`;
        progressBar.setAttribute('aria-valuenow', String(normalizedPct));
    }
    if (progressText) {
        progressText.textContent = label ? `${label}` : `${normalizedPct}%`;
    }
}

function setExportStage(progressBar, progressText, startPct, endPct, label, initialPct = startPct) {
    exportProgressState = {
        startPct,
        endPct,
        label,
        progressBar,
        progressText
    };

    setExportProgress(progressBar, progressText, initialPct, `${label} ${Math.round(initialPct)}%`);
}

function showExportNotification(message) {
    let notice = document.getElementById('export-notice');

    if (!notice) {
        notice = document.createElement('div');
        notice.id = 'export-notice';
        notice.className = 'app-notice';
        document.body.appendChild(notice);
    }

    notice.textContent = message;
    notice.classList.add('is-visible');

    clearTimeout(showExportNotification.timerId);
    showExportNotification.timerId = setTimeout(() => {
        notice.classList.remove('is-visible');
    }, 2600);
}

function updateExportButtonsState() {
    const canExport = hasTimelineTracks();

    document.querySelectorAll('.export').forEach(element => {
        element.classList.toggle('is-disabled', !canExport);
        element.setAttribute('aria-disabled', canExport ? 'false' : 'true');
        element.setAttribute(
            'title',
            canExport
                ? t('export.buttonReady', {}, 'Экспортировать проект')
                : t('export.buttonEmpty', {}, 'Сначала добавьте хотя бы один файл на таймлайн')
        );
    });
}

function bindExportAvailabilityWatcher() {
    const layersEl = document.getElementById('layers');
    if (!layersEl) return;

    updateExportButtonsState();

    const observer = new MutationObserver(() => {
        updateExportButtonsState();
    });

    observer.observe(layersEl, {
        childList: true,
        subtree: true
    });
}

window.addEventListener('vigu:languagechange', () => {
    updateExportButtonsState();
});

function getExportSettingsSummary() {
    const qualityLabel = EXPORT_QUALITY_OPTIONS.find(
        option => option.value === EXPORT_CONFIG.maxLongSide
    )?.label || `${EXPORT_CONFIG.maxLongSide}p`;

    return {
        qualityLabel,
        fpsLabel: String(EXPORT_CONFIG.maxFps),
        hdrLabel: EXPORT_CONFIG.hdrMode === 'fast'
            ? t('export.hdrFast', {}, 'Быстрый HDR')
            : t('export.hdrSlow', {}, 'Медленный HDR')
    };
}

function requestExportSettings() {
    const modalEl = document.getElementById('modal-export-settings');
    const qualitySelect = document.getElementById('export-quality');
    const fpsSelect = document.getElementById('export-fps');
    const hdrModeSelect = document.getElementById('export-hdr-mode');
    const confirmButton = document.getElementById('btn-start-export');

    if (!modalEl || !qualitySelect || !fpsSelect || !hdrModeSelect || !confirmButton) {
        return Promise.resolve(true);
    }

    qualitySelect.value = String(EXPORT_CONFIG.maxLongSide);
    fpsSelect.value = String(EXPORT_CONFIG.maxFps);
    hdrModeSelect.value = EXPORT_CONFIG.hdrMode;

    const modal = globalThis.bootstrap.Modal.getOrCreateInstance(modalEl);

    return new Promise(resolve => {
        let resolved = false;

        const cleanup = () => {
            confirmButton.removeEventListener('click', onConfirm);
            modalEl.removeEventListener('hidden.bs.modal', onHidden);
        };

        const onConfirm = () => {
            EXPORT_CONFIG.maxLongSide = safeNumber(qualitySelect.value, 1920);
            EXPORT_CONFIG.maxFps = safeNumber(fpsSelect.value, 30);
            EXPORT_CONFIG.hdrMode = hdrModeSelect.value === 'fast' ? 'fast' : 'slow';
            resolved = true;
            cleanup();
            modal.hide();
            resolve(true);
        };

        const onHidden = () => {
            cleanup();
            if (!resolved) {
                resolve(false);
            }
        };

        confirmButton.addEventListener('click', onConfirm);
        modalEl.addEventListener('hidden.bs.modal', onHidden, { once: true });
        modal.show();
    });
}

function ensureEven(n) {
    n = Math.max(2, Math.round(n));
    return n % 2 === 0 ? n : n - 1;
}

function scaleToMaxLongSide(w, h, maxLongSide) {
    const srcW = ensureEven(w || 1280);
    const srcH = ensureEven(h || 720);

    const longSide = Math.max(srcW, srcH);
    if (longSide <= maxLongSide) {
        return { w: srcW, h: srcH };
    }

    const scale = maxLongSide / longSide;
    return {
        w: ensureEven(srcW * scale),
        h: ensureEven(srcH * scale)
    };
}

function getProjectBaseResolution(allTracks) {
    const firstSizedTrack = allTracks.find(
        t => safeNumber(t?.source?.width, 0) > 0 && safeNumber(t?.source?.height, 0) > 0
    );

    const srcW = firstSizedTrack ? safeNumber(firstSizedTrack.source.width, 1280) : 1280;
    const srcH = firstSizedTrack ? safeNumber(firstSizedTrack.source.height, 720) : 720;

    return scaleToMaxLongSide(srcW, srcH, EXPORT_CONFIG.maxLongSide);
}

function getProjectDuration(allTracks) {
    let maxEnd = 0;
    for (const track of allTracks) {
        maxEnd = Math.max(maxEnd, getTrackEnd(track));
    }
    return Math.max(0.1, maxEnd);
}

function getPreparedTracksDuration(preparedTracks) {
    let maxEnd = 0;
    for (const track of preparedTracks) {
        maxEnd = Math.max(maxEnd, safeNumber(track?.end, 0));
    }
    return Math.max(0.1, maxEnd);
}

function getProjectFps() {
    return EXPORT_CONFIG.maxFps;
}

async function cleanupFsFile(name) {
    try {
        await ffmpeg.deleteFile(name);
    } catch (e) {}
}

async function downloadFsFile(fileName, downloadName) {
    logExportStep('Reading output file from FFmpeg FS', { fileName, downloadName });
    const data = await ffmpeg.readFile(fileName);
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    logExportStep('Output file read complete', { fileName, bytes: bytes.byteLength });
    const blob = new Blob([bytes.slice().buffer], { type: 'video/mp4' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = downloadName;
    link.style.display = 'none';

    document.body.appendChild(link);
    await new Promise(resolve => {
        requestAnimationFrame(() => {
            logExportStep('Triggering browser download', { downloadName, bytes: bytes.byteLength });
            link.click();
            resolve();
        });
    });
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

async function execOrThrow(args, errorMessage, logLabel = 'FFmpeg operation') {
    logExportStep('FFmpeg exec start', {
        operation: logLabel,
        args
    });
    const isFinalAssembly = logLabel.includes('Assemble final video');
    const timeoutMs = isFinalAssembly
        ? -1
        : EXPORT_CONFIG.ffmpegExecTimeoutMs;
    const inactivityTimeoutMs = isFinalAssembly
        ? EXPORT_CONFIG.finalAssemblyInactivityTimeoutMs
        : EXPORT_CONFIG.ffmpegExecTimeoutMs;
    let exitCode;
    let stalled = false;
    let stallWatcherStopped = false;

    ffmpegLastActivityAt = Date.now();

    const stallWatcher = (async () => {
        while (!stallWatcherStopped) {
            await sleep(1000);
            if (stallWatcherStopped) break;
            if (Date.now() - ffmpegLastActivityAt <= inactivityTimeoutMs) continue;

            stalled = true;
            logExportStep('FFmpeg inactivity timeout', {
                operation: logLabel,
                inactivityTimeoutMs,
                lastActivityAt: ffmpegLastActivityAt
            });

            try {
                ffmpeg.terminate();
            } catch (terminateError) {}

            ffmpegLoaded = false;
            ffmpegTerminatedByTimeout = true;
            break;
        }
    })();

    try {
        exitCode = await ffmpeg.exec(args, timeoutMs);
    } catch (error) {
        if (stalled || error?.code === 'EXPORT_TIMEOUT') {
            const failTimeoutMs = stalled ? inactivityTimeoutMs : timeoutMs;
            throw createTimeoutError(
                `${errorMessage} Операция "${logLabel}" не подавала признаков активности дольше ${Math.round(failTimeoutMs / 1000)} сек.`
            );
        }

        throw error;
    } finally {
        stallWatcherStopped = true;
        await stallWatcher;
    }

    logExportStep('FFmpeg exec end', {
        operation: logLabel,
        exitCode
    });

    if (stalled) {
        throw createTimeoutError(
            `${errorMessage} Операция "${logLabel}" не подавала признаков активности дольше ${Math.round(inactivityTimeoutMs / 1000)} сек.`
        );
    }

    if (exitCode !== 0) {
        throw new Error(`${errorMessage} Код FFmpeg: ${exitCode}.`);
    }
}

/**
 * =========================================================
 * EXIF ORIENTATION FOR IMAGES
 * =========================================================
 */

function readJPEGOrientation(arrayBuffer) {
    const view = new DataView(arrayBuffer);

    if (view.byteLength < 4 || view.getUint16(0, false) !== 0xFFD8) {
        return 1;
    }

    let offset = 2;

    while (offset + 4 < view.byteLength) {
        const marker = view.getUint16(offset, false);
        offset += 2;

        if (marker === 0xFFE1) {
            offset += 2;

            if (
                offset + 6 > view.byteLength ||
                view.getUint32(offset, false) !== 0x45786966 ||
                view.getUint16(offset + 4, false) !== 0x0000
            ) {
                return 1;
            }

            offset += 6;

            if (offset + 8 > view.byteLength) return 1;

            const little = view.getUint16(offset, false) === 0x4949;
            const tiffOffset = offset;

            const firstIFDOffset = view.getUint32(offset + 4, little);
            let ifdOffset = tiffOffset + firstIFDOffset;

            if (ifdOffset + 2 > view.byteLength) return 1;

            const entries = view.getUint16(ifdOffset, little);
            ifdOffset += 2;

            for (let i = 0; i < entries; i++) {
                const entryOffset = ifdOffset + i * 12;
                if (entryOffset + 12 > view.byteLength) break;

                const tag = view.getUint16(entryOffset, little);
                if (tag === 0x0112) {
                    const value = view.getUint16(entryOffset + 8, little);
                    return value || 1;
                }
            }

            return 1;
        }

        if ((marker & 0xFF00) !== 0xFF00) break;
        if (offset + 2 > view.byteLength) break;

        const size = view.getUint16(offset, false);
        offset += size;
    }

    return 1;
}

async function normalizeImageOrientation(fileOrBlob) {
    const mime = (fileOrBlob?.type || '').toLowerCase();
    const arrayBuffer = await fileOrBlob.arrayBuffer();

    const orientation = /image\/jpe?g/.test(mime) ? readJPEGOrientation(arrayBuffer) : 1;

    if (orientation === 1) {
        return new Uint8Array(arrayBuffer);
    }

    const blob = new Blob([arrayBuffer], { type: mime || 'image/jpeg' });
    const bitmap = await createImageBitmap(blob);

    const srcW = bitmap.width;
    const srcH = bitmap.height;
    const swapSides = [5, 6, 7, 8].includes(orientation);

    const canvas = document.createElement('canvas');
    canvas.width = swapSides ? srcH : srcW;
    canvas.height = swapSides ? srcW : srcH;

    const ctx = canvas.getContext('2d');

    switch (orientation) {
        case 2:
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            break;
        case 3:
            ctx.translate(canvas.width, canvas.height);
            ctx.rotate(Math.PI);
            break;
        case 4:
            ctx.translate(0, canvas.height);
            ctx.scale(1, -1);
            break;
        case 5:
            ctx.rotate(0.5 * Math.PI);
            ctx.scale(1, -1);
            break;
        case 6:
            ctx.translate(canvas.width, 0);
            ctx.rotate(0.5 * Math.PI);
            break;
        case 7:
            ctx.translate(canvas.width, canvas.height);
            ctx.rotate(0.5 * Math.PI);
            ctx.scale(-1, 1);
            break;
        case 8:
            ctx.translate(0, canvas.height);
            ctx.rotate(-0.5 * Math.PI);
            break;
        default:
            break;
    }

    ctx.drawImage(bitmap, 0, 0);

    const normalizedBlob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
            if (!result) reject(new Error(t('export.normalizeImageError', {}, 'Не удалось нормализовать изображение.')));
            else resolve(result);
        }, 'image/png');
    });

    return new Uint8Array(await normalizedBlob.arrayBuffer());
}

async function getSourceBytes(track) {
    const source = track?.source || {};

    if (hasFileObject(track)) {
        if (isImageTrack(track)) {
            return await normalizeImageOrientation(source.file);
        }
        return new Uint8Array(await source.file.arrayBuffer());
    }

    if (typeof source.url === 'string' && source.url.trim()) {
        return await fetchFile(source.url.trim());
    }

    if (source.bytes instanceof Uint8Array) {
        return source.bytes;
    }

    if (source.buffer instanceof ArrayBuffer) {
        return new Uint8Array(source.buffer);
    }

    if (source.url instanceof Blob) {
        if (isImageTrack(track)) {
            return await normalizeImageOrientation(source.url);
        }
        return new Uint8Array(await source.url.arrayBuffer());
    }

    console.error('Bad track source:', track);
    throw new Error(t('export.getSourceError', {}, 'Не удалось получить исходный файл для трека.'));
}

/**
 * =========================================================
 * EFFECTS / COLOR
 * =========================================================
 */

function normalizeEffects(rawEffects = {}) {
    const effects = rawEffects || {};

    return {
        brightness: clamp(safeNumber(effects.brightness, 0), -1, 1),
        contrast: clamp(safeNumber(effects.contrast, 1), 0, 10),
        saturation: clamp(safeNumber(effects.saturation, 1), 0, 10),
        gamma: clamp(safeNumber(effects.gamma, 1), 0.1, 10),
        temperature: clamp(safeNumber(effects.temperature, 0), -1, 1),
        tint: clamp(safeNumber(effects.tint, 0), -1, 1)
    };
}

function buildColorFilterChain(track) {
    const fx = normalizeEffects(track?.effects);
    const chain = [];

    if (
        fx.brightness !== 0 ||
        fx.contrast !== 1 ||
        fx.saturation !== 1 ||
        fx.gamma !== 1
    ) {
        chain.push(
            `eq=brightness=${fx.brightness}:contrast=${fx.contrast}:saturation=${fx.saturation}:gamma=${fx.gamma}`
        );
    }

    if (fx.temperature !== 0 || fx.tint !== 0) {
        const rs = clamp(fx.temperature, -1, 1);
        const bs = clamp(-fx.temperature, -1, 1);
        const gs = clamp(-fx.tint, -1, 1);
        chain.push(`colorbalance=rs=${rs}:gs=${gs}:bs=${bs}`);
    }

    return chain;
}

/**
 * SDR-safe export.
 */
function getUnifiedVideoEncodingParams(fps) {
    return [
        '-r', String(fps),
        '-c:v', 'libx264',
        '-preset', EXPORT_CONFIG.preset,
        '-crf', String(EXPORT_CONFIG.videoCrf),
        '-threads', String(EXPORT_CONFIG.videoThreads),
        '-pix_fmt', 'yuv420p'
    ];
}

function getUnifiedAudioEncodingParams() {
    return [
        '-c:a', 'aac',
        '-ar', String(EXPORT_CONFIG.audioSampleRate),
        '-ac', '2',
        '-b:a', EXPORT_CONFIG.audioBitrate
    ];
}

async function probeVideoColorInfo(fileName, trackIndex) {
    const probeFileName = `probe_${trackIndex}.txt`;

    try {
        await ffmpeg.ffprobe([
            '-v', 'error',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=color_space,color_transfer,color_primaries,pix_fmt',
            '-of', 'default=noprint_wrappers=1',
            fileName,
            '-o', probeFileName
        ]);

        const data = await ffmpeg.readFile(probeFileName, 'utf8');
        const text = typeof data === 'string' ? data : new TextDecoder().decode(data);

        const info = {};
        text.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) info[key.trim()] = value.trim().toLowerCase();
        });

        return info;
    } catch (error) {
        return {};
    } finally {
        await cleanupFsFile(probeFileName);
    }
}

async function probeHasAudioStream(fileName, trackIndex) {
    const probeFileName = `probe_audio_${trackIndex}.txt`;

    try {
        await ffmpeg.ffprobe([
            '-v', 'error',
            '-select_streams', 'a:0',
            '-show_entries', 'stream=index',
            '-of', 'csv=p=0',
            fileName,
            '-o', probeFileName
        ]);

        const data = await ffmpeg.readFile(probeFileName, 'utf8');
        const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
        return text.trim().length > 0;
    } catch (error) {
        return false;
    } finally {
        await cleanupFsFile(probeFileName);
    }
}

function isHdrColorInfo(colorInfo = {}) {
    const transfer = String(colorInfo.color_transfer || '').toLowerCase();
    const primaries = String(colorInfo.color_primaries || '').toLowerCase();
    const colorSpace = String(colorInfo.color_space || '').toLowerCase();
    const pixFmt = String(colorInfo.pix_fmt || '').toLowerCase();

    return (
        transfer === 'smpte2084' ||
        transfer === 'arib-std-b67' ||
        primaries.startsWith('bt2020') ||
        colorSpace.startsWith('bt2020') ||
        /p10|10le|12le/.test(pixFmt)
    );
}

function buildHdrToSdrFilter({ w, h, hdrMode = EXPORT_CONFIG.hdrMode }) {
    const preScale = `scale=${w}:${h}:force_original_aspect_ratio=decrease`;

    if (hdrMode === 'fast') {
        return [
            preScale,
            'zscale=t=linear:npl=60',
            'format=gbrpf32le',
            'tonemap=reinhard:desat=0.25',
            'zscale=t=bt709:m=bt709:p=bt709:r=tv'
        ];
    }

    return [
        preScale,
        'zscale=t=linear:npl=80',
        'format=gbrpf32le',
        'tonemap=hable:desat=0',
        'zscale=t=bt709:m=bt709:p=bt709:r=tv'
    ];
}

function buildPrepFilter({ track, w, h, colorInfo, hdrMode }) {
    const chain = [];
    const hdrSource = isVideoTrack(track) && isHdrColorInfo(colorInfo);

    if (hdrSource) {
        chain.push(...buildHdrToSdrFilter({ w, h, hdrMode }));
    } else {
        chain.push(`scale=${w}:${h}:force_original_aspect_ratio=decrease`);
    }

    chain.push(`pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`);
    chain.push('setsar=1');
    chain.push(...buildColorFilterChain(track));
    chain.push('format=yuv420p');

    return chain.join(',');
}

/**
 * =========================================================
 * PREP TRACK CLIPS
 * =========================================================
 */

async function prepareTrackClip({ track, trackIndex, w, h, fps }) {
    const srcName = `src_${trackIndex}`;
    const outName = `prep_${trackIndex}.mp4`;

    const duration = getTrimmedDuration(track);
    const trimStart = getTrackTrimStart(track);

    console.log('EXPORT TRACK SOURCE:', track);

    const sourceBytes = await getSourceBytes(track);
    await ffmpeg.writeFile(srcName, sourceBytes);

    const colorInfo = isVideoTrack(track) ? await probeVideoColorInfo(srcName, trackIndex) : {};
    const isHdrSource = isVideoTrack(track) && isHdrColorInfo(colorInfo);
    const videoParams = getUnifiedVideoEncodingParams(fps);
    const audioParams = getUnifiedAudioEncodingParams();

    const transcodeTrack = async (hdrMode) => {
        const prepFilter = buildPrepFilter({ track, w, h, colorInfo, hdrMode });
        resetRecentFfmpegLogs();

        if (isImageTrack(track)) {
            await execOrThrow([
                '-framerate', String(fps),
                '-loop', '1',
                '-i', srcName,
                '-f', 'lavfi',
                '-t', `${duration}`,
                '-i', `anullsrc=cl=stereo:r=${EXPORT_CONFIG.audioSampleRate}`,
                '-t', `${duration}`,
                '-vf', prepFilter,
                ...videoParams,
                ...audioParams,
                '-shortest',
                outName
            ], t('export.prepareClipError', { index: trackIndex + 1 }, `Не удалось подготовить клип ${trackIndex + 1}.`), `Prepare clip ${trackIndex + 1}`);
        } else {
            await execOrThrow([
                '-ss', `${trimStart}`,
                '-i', srcName,
                '-t', `${duration}`,
                '-map', '0:v:0',
                '-map', '0:a:0?',
                '-vf', prepFilter,
                '-af', `aresample=${EXPORT_CONFIG.audioSampleRate}:async=1:first_pts=0`,
                '-sn',
                ...videoParams,
                ...audioParams,
                '-shortest',
                outName
            ], t('export.prepareClipError', { index: trackIndex + 1 }, `Не удалось подготовить клип ${trackIndex + 1}.`), `Prepare clip ${trackIndex + 1}`);
        }
    };

    try {
        try {
            await transcodeTrack(EXPORT_CONFIG.hdrMode);
        } catch (error) {
            const shouldRetryFastHdr =
                isHdrSource &&
                EXPORT_CONFIG.hdrMode === 'slow' &&
                hasRecentFfmpegLog('Aborted(OOM)');

            if (!shouldRetryFastHdr) {
                throw error;
            }

            console.warn(`HDR slow mode OOM on clip ${trackIndex + 1}, retrying with fast HDR mode.`);
            await cleanupFsFile(outName);
            await transcodeTrack('fast');
        }
    } finally {
        await cleanupFsFile(srcName);
    }

    const hasAudio = await probeHasAudioStream(outName, trackIndex);

    return {
        fileName: outName,
        start: getTrackStart(track),
        end: getTrackEnd(track),
        layerIndex: safeNumber(track?.layerIndex, 0),
        duration,
        isHdrSource,
        hasAudio
    };
}

/**
 * =========================================================
 * TIMELINE COMPOSITE
 * =========================================================
 */

function sortTracksForOverlay(preparedTracks) {
    return [...preparedTracks].sort((a, b) => {
        if (a.layerIndex !== b.layerIndex) return a.layerIndex - b.layerIndex;
        if (a.start !== b.start) return a.start - b.start;
        return 0;
    });
}

function buildTimelineFilterComplex(preparedTracks, baseVideoInputIndex = 0, firstTrackInputIndex = 1) {
    const parts = [];

    parts.push(`[${baseVideoInputIndex}:v]format=yuv420p[basev]`);

    const sortedForVideo = sortTracksForOverlay(preparedTracks);
    let currentVideoLabel = '[basev]';

    sortedForVideo.forEach((track, sortedIdx) => {
        const inputIndex = firstTrackInputIndex + preparedTracks.findIndex(t => t.fileName === track.fileName);
        const shiftedVideo = `[vshift_${sortedIdx}]`;
        const overlaidOut = `[vout_${sortedIdx}]`;

        parts.push(
            `[${inputIndex}:v]setpts=PTS-STARTPTS+${track.start}/TB${shiftedVideo}`
        );

        parts.push(
            `${currentVideoLabel}${shiftedVideo}overlay=eof_action=pass:repeatlast=0:shortest=0${overlaidOut}`
        );

        currentVideoLabel = overlaidOut;
    });

    return {
        filterComplex: parts.join(';'),
        finalVideoLabel: currentVideoLabel
    };
}

function buildAudioMixFilterComplex(preparedTracks, audioBaseInputIndex = 1, firstTrackInputIndex = 2) {
    const sortedTracks = [...preparedTracks].sort((a, b) => a.start - b.start);
    const parts = [
        `[${audioBaseInputIndex}:a]atrim=duration=${getPreparedTracksDuration(preparedTracks)},asetpts=PTS-STARTPTS[abase]`
    ];
    const mixInputs = ['[abase]'];

    sortedTracks.forEach((track, sortedIdx) => {
        if (!track?.hasAudio) return;

        const inputIndex = firstTrackInputIndex + preparedTracks.findIndex(t => t.fileName === track.fileName);
        const delayMs = Math.max(0, Math.round(track.start * 1000));
        const delayedAudio = `[adelay_${sortedIdx}]`;

        parts.push(
            `[${inputIndex}:a]aresample=${EXPORT_CONFIG.audioSampleRate}:async=1:first_pts=0,atrim=duration=${track.duration},adelay=${delayMs}|${delayMs}${delayedAudio}`
        );
        mixInputs.push(delayedAudio);
    });

    parts.push(
        `${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=longest:normalize=0[aout]`
    );

    return {
        filterComplex: parts.join(';'),
        finalAudioLabel: '[aout]'
    };
}

function hasTemporalOverlap(preparedTracks) {
    const sorted = [...preparedTracks].sort((a, b) => a.start - b.start);

    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].start < sorted[i - 1].end - 0.001) {
            return true;
        }
    }

    return false;
}

function canUseConcatAssembly(preparedTracks) {
    if (!preparedTracks.length) return false;
    if (hasTemporalOverlap(preparedTracks)) return false;

    const sorted = [...preparedTracks].sort((a, b) => a.start - b.start);
    let cursor = 0;

    for (const track of sorted) {
        if (track.start < cursor - 0.001) {
            return false;
        }
        cursor = Math.max(cursor, track.end);
    }

    return true;
}

function canUsePreparedOverlayAssembly(preparedTracks) {
    if (preparedTracks.length <= 1) return false;
    return hasTemporalOverlap(preparedTracks);
}

async function createGapClip({ duration, index, w, h, fps }) {
    const fileName = `gap_${index}.mp4`;
    const videoParams = getUnifiedVideoEncodingParams(fps);
    const audioParams = getUnifiedAudioEncodingParams();

    await execOrThrow([
        '-f', 'lavfi',
        '-i', `color=c=black:s=${w}x${h}:r=${fps}:d=${duration}`,
        '-f', 'lavfi',
        '-t', `${duration}`,
        '-i', `anullsrc=cl=stereo:r=${EXPORT_CONFIG.audioSampleRate}`,
        ...videoParams,
        ...audioParams,
        '-shortest',
        fileName
    ], `Failed to prepare gap clip ${index + 1}.`, `Prepare gap clip ${index + 1}`);

    return fileName;
}

async function assembleWithConcat({ preparedTracks, projectDuration, w, h, fps }) {
    logExportStep('Concat assembly selected', {
        preparedTracks: preparedTracks.length,
        projectDuration,
        resolution: `${w}x${h}`,
        fps
    });
    const sorted = [...preparedTracks].sort((a, b) => a.start - b.start);
    const concatEntries = [];
    const tempFiles = [];
    let cursor = 0;

    for (let i = 0; i < sorted.length; i++) {
        const track = sorted[i];
        const gapDuration = Math.max(0, track.start - cursor);

        if (gapDuration > 0.001) {
            logExportStep('Creating concat gap clip', { index: i, gapDuration });
            const gapFile = await createGapClip({
                duration: gapDuration,
                index: i,
                w,
                h,
                fps
            });
            concatEntries.push(gapFile);
            tempFiles.push(gapFile);
        }

        concatEntries.push(track.fileName);
        cursor = Math.max(cursor, track.end);
    }

    const tailGap = Math.max(0, projectDuration - cursor);
    if (tailGap > 0.001) {
        logExportStep('Creating concat tail gap clip', { index: sorted.length, tailGap });
        const gapFile = await createGapClip({
            duration: tailGap,
            index: sorted.length,
            w,
            h,
            fps
        });
        concatEntries.push(gapFile);
        tempFiles.push(gapFile);
    }

    const listFileName = 'concat_input.txt';
    const concatManifest = concatEntries
        .map(fileName => `file '${fileName.replace(/'/g, "'\\''")}'`)
        .join('\n');

    logExportStep('Concat manifest prepared', {
        entries: concatEntries,
        manifestLength: concatManifest.length
    });
    await ffmpeg.writeFile(listFileName, new TextEncoder().encode(concatManifest));
    tempFiles.push(listFileName);

    try {
        await execOrThrow([
            '-f', 'concat',
            '-safe', '0',
            '-fflags', '+genpts',
            '-i', listFileName,
            '-c', 'copy',
            '-avoid_negative_ts', 'make_zero',
            EXPORT_CONFIG.outputFileName
        ], t('export.finalVideoError', {}, 'Не удалось собрать итоговое видео.'), 'Assemble final video with concat');
    } finally {
        for (const tempFile of tempFiles) {
            await cleanupFsFile(tempFile);
        }
    }
}

async function assembleWithPreparedOverlay({ progressBar, progressText, preparedTracks, projectDuration, w, h, fps }) {
    logExportStep('Prepared FFmpeg overlay assembly selected', {
        preparedTracks: preparedTracks.length,
        projectDuration,
        resolution: `${w}x${h}`,
        fps
    });
    setExportStage(progressBar, progressText, 95, 99, t('export.overlayAssembly', {}, 'Склеивание наложений'), 95);

    const videoComplex = buildTimelineFilterComplex(preparedTracks, 0, 2);
    const audioComplex = buildAudioMixFilterComplex(preparedTracks);
    const filterComplex = `${videoComplex.filterComplex};${audioComplex.filterComplex}`;
    const videoParams = getUnifiedVideoEncodingParams(fps);
    const audioParams = getUnifiedAudioEncodingParams();
    const ffmpegArgs = [
        '-f', 'lavfi',
        '-i', `color=c=black:s=${w}x${h}:r=${fps}:d=${projectDuration}`,
        '-f', 'lavfi',
        '-t', `${projectDuration}`,
        '-i', `anullsrc=cl=stereo:r=${EXPORT_CONFIG.audioSampleRate}`
    ];

    preparedTracks.forEach(track => {
        ffmpegArgs.push('-i', track.fileName);
    });

    ffmpegArgs.push(
        '-filter_complex', filterComplex,
        '-map', videoComplex.finalVideoLabel,
        '-map', audioComplex.finalAudioLabel,
        ...videoParams,
        ...audioParams,
        '-movflags', '+faststart',
        '-t', `${projectDuration}`,
        '-shortest',
        EXPORT_CONFIG.outputFileName
    );

    await execOrThrow(
        ffmpegArgs,
        t('export.finalVideoError', {}, 'Не удалось собрать итоговое видео.'),
        'Assemble final video with FFmpeg overlay'
    );

    setExportStage(progressBar, progressText, 99, 100, t('export.downloading', {}, 'Скачивание'), 99);
    logExportStep('Final file ready in FFmpeg FS after prepared overlay assembly', {
        outputFileName: EXPORT_CONFIG.outputFileName
    });
    await downloadFsFile(
        EXPORT_CONFIG.outputFileName,
        `render_vigu_${Date.now()}.mp4`
    );
    setExportProgress(progressBar, progressText, 100, t('export.downloadingDone', {}, 'Скачивание 100%'));
}

async function exportWithBrowserFallback(progressBar, progressText) {
    logExportStep('Emergency browser fallback export selected');
    setExportStage(progressBar, progressText, 95, 100, 'Резервный экспорт браузером', 95);

    if (typeof globalThis.exportVideo !== 'function') {
        throw new Error('Похоже, с нашей стороны ошибка. Попробуй ещё раз.');
    }

    await globalThis.exportVideo();
    setExportProgress(progressBar, progressText, 100, t('export.downloadingDone', {}, 'Скачивание 100%'));
}

/**
 * =========================================================
 * EXPORT
 * =========================================================
 */

document.querySelectorAll('.export').forEach(element => {
    element.addEventListener('click', async () => {
        if (!hasTimelineTracks()) {
            showExportNotification(t('export.emptyTimeline', {}, 'Сначала добавьте хотя бы один файл на таймлайн, чтобы начать экспорт.'));
            return;
        }

        const shouldExport = await requestExportSettings();
        if (!shouldExport) return;

        const exportWindow = document.getElementById('modal-export-video');
        const windowSuccess = exportWindow ? new globalThis.bootstrap.Modal(exportWindow) : null;
        const progressBar = document.getElementById('export-progress-bar');
        const progressText = document.getElementById('export-progress-text');
        const { qualityLabel, fpsLabel, hdrLabel } = getExportSettingsSummary();
        let exportCompletedSuccessfully = false;

        if (progressBar) {
            progressBar.classList.add('progress-bar-animated');
            progressBar.classList.remove('bg-danger');
        }
        if (progressText) {
            progressText.textContent = `${qualityLabel} • ${fpsLabel} FPS • ${hdrLabel}`;
        }
        setExportStage(progressBar, progressText, 0, 5, t('export.loadingFfmpeg', {}, 'Загрузка FFmpeg'), 0);

        if (windowSuccess) windowSuccess.show();

        try {
            logExportStep('Export requested', {
                qualityLabel,
                fpsLabel,
                hdrLabel
            });
            await ensureFFmpegLoaded(progressBar, progressText);
            logExportStep('FFmpeg ready');

            const allTracks = [];

            getTimelineLayers().forEach(layer => {
                layer.tracks.forEach(track => {
                    allTracks.push({
                        ...track,
                        layerIndex: safeNumber(layer?.index, 0)
                    });
                });
            });

            allTracks.sort((a, b) => getTrackStart(a) - getTrackStart(b));
            logExportStep('Timeline tracks collected', {
                totalTracks: allTracks.length,
                layers: getTimelineLayers().length
            });

            if (allTracks.length === 0) {
                if (windowSuccess) windowSuccess.hide();
                return;
            }

            const { w, h } = getProjectBaseResolution(allTracks);
            const fps = getProjectFps();
            const projectDuration = getProjectDuration(allTracks);
            logExportStep('Project export params', {
                resolution: `${w}x${h}`,
                fps,
                projectDuration
            });

            setExportStage(progressBar, progressText, 5, 95, t('export.preparingClips', {}, 'Подготовка клипов'), 5);

            const preparedTracks = [];

            for (let i = 0; i < allTracks.length; i++) {
                const rangeStart = 5 + (90 * i) / Math.max(1, allTracks.length);
                const rangeEnd = 5 + (90 * (i + 1)) / Math.max(1, allTracks.length);
                const isLikelyHdr = isVideoTrack(allTracks[i]);

                setExportStage(
                    progressBar,
                    progressText,
                    rangeStart,
                    rangeEnd,
                    isLikelyHdr
                        ? t('export.preparingClipSlow', { current: i + 1, total: allTracks.length }, `Подготовка клипа ${i + 1}/${allTracks.length} (видео/HDR может быть медленно)`)
                        : t('export.preparingClip', { current: i + 1, total: allTracks.length }, `Подготовка клипа ${i + 1}/${allTracks.length}`),
                    rangeStart
                );

                const prepared = await prepareTrackClip({
                    track: allTracks[i],
                    trackIndex: i,
                    w,
                    h,
                    fps
                });

                preparedTracks.push(prepared);
                logExportStep('Prepared clip complete', prepared);
            }

            logExportStep('All clips prepared', {
                preparedTracks: preparedTracks.length
            });

            if (
                preparedTracks.length === 1 &&
                Math.abs(preparedTracks[0].start) < 0.001 &&
                Math.abs(preparedTracks[0].duration - projectDuration) < 0.05
            ) {
                logExportStep('Single clip fast path selected', preparedTracks[0]);
                await downloadFsFile(
                    preparedTracks[0].fileName,
                    `render_vigu_${Date.now()}.mp4`
                );

                setExportProgress(progressBar, progressText, 100, t('export.downloadingDone', {}, 'Скачивание 100%'));

                await cleanupFsFile(preparedTracks[0].fileName);
                exportCompletedSuccessfully = true;
                return;
            }

            if (canUseConcatAssembly(preparedTracks)) {
                logExportStep('Final assembly mode', { mode: 'concat' });
                setExportStage(progressBar, progressText, 95, 99, t('export.concatAssembly', {}, 'Склеивание клипов'), 95);
                await assembleWithConcat({
                    preparedTracks,
                    projectDuration,
                    w,
                    h,
                    fps
                });
            } else if (canUsePreparedOverlayAssembly(preparedTracks)) {
                logExportStep('Final assembly mode', { mode: 'prepared-ffmpeg-overlay' });
                try {
                    await assembleWithPreparedOverlay({
                        progressBar,
                        progressText,
                        preparedTracks,
                        projectDuration,
                        w,
                        h,
                        fps
                    });
                    exportCompletedSuccessfully = true;
                } finally {
                    for (const t of preparedTracks) {
                        await cleanupFsFile(t.fileName);
                    }
                    await cleanupFsFile(EXPORT_CONFIG.outputFileName);
                }
                return;
            } else {
                logExportStep('Final assembly mode', {
                    mode: 'emergency-browser-fallback',
                    reason: 'no stable final assembly path matched'
                });
                showExportNotification('Похоже, с нашей стороны ошибка. Попробуй ещё раз.');
                await exportWithBrowserFallback(progressBar, progressText);
                exportCompletedSuccessfully = true;
                return;
            }

            setExportStage(progressBar, progressText, 99, 100, t('export.downloading', {}, 'Скачивание'), 99);
            logExportStep('Final file ready in FFmpeg FS', {
                outputFileName: EXPORT_CONFIG.outputFileName
            });
            await downloadFsFile(
                EXPORT_CONFIG.outputFileName,
                `render_vigu_${Date.now()}.mp4`
            );

            setExportProgress(progressBar, progressText, 100, t('export.downloadingDone', {}, 'Скачивание 100%'));
            exportCompletedSuccessfully = true;

            for (const t of preparedTracks) {
                await cleanupFsFile(t.fileName);
            }
            await cleanupFsFile(EXPORT_CONFIG.outputFileName);
        } catch (err) {
            console.error(t('export.renderError', {}, 'Ошибка рендера') + ':', err);
            if (progressText) {
                progressText.textContent = err?.message || t('export.renderError', {}, 'Ошибка рендера');
            }
            if (progressBar) {
                progressBar.style.width = '100%';
                progressBar.classList.remove('progress-bar-animated');
                progressBar.classList.add('bg-danger');
            }
            const friendlyMessage = 'Похоже, с нашей стороны ошибка. Попробуй ещё раз.';
            showExportNotification(friendlyMessage);
            alert(err?.message || friendlyMessage);
        } finally {
            if (exportCompletedSuccessfully) {
                setTimeout(() => {
                    if (windowSuccess) windowSuccess.hide();
                }, 2000);
            }
        }
    });
});

bindExportAvailabilityWatcher();
