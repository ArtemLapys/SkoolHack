const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });
const ffmpegReady = ffmpeg.load();

/** UPDATED: явное задание цветовых метаданных и корректный формат пикселей */
const commonColorTags = [
    '-colorspace', 'bt709',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709',
    '-color_range', 'pc' // pc = full range (0..255). Альтернатива: 'tv' = limited (16..235)
];

function getColorParams(isHDR = false) {
    if (isHDR) {
        return [
            '-pix_fmt', 'yuv420p10le', 
            '-colorspace', 'bt2020nc',
            '-color_primaries', 'bt2020',
            '-color_trc', 'smpte2084', 
            '-color_range', 'tv',
            '-profile:v', 'high10' // Добавляем профиль для 10 бит в x264
        ];
    } else {
        return [
            '-pix_fmt', 'yuv420p',
            '-colorspace', 'bt709',
            '-color_primaries', 'bt709',
            '-color_trc', 'bt709',
            '-color_range', 'tv'
        ];
    }
}

  

document.querySelectorAll(".export").forEach(element => {
    element.addEventListener("click", async (e) => {
        await ffmpegReady;
        

        const allTracks = [];
        layers.forEach(layer => {
            layer.tracks.forEach(track => {
                allTracks.push({ ...track, layerIndex: layer.index });
            });
        });
        allTracks.sort((a, b) => (a.start || 0) - (b.start || 0));

        if (allTracks.length === 0) return;

        // 1. ОПРЕДЕЛЯЕМ ПАРАМЕТРЫ ПРОЕКТА (по первому видео)
        const firstVideo = allTracks.find(t => t.source && t.source.width > 0);
        const w = firstVideo ? firstVideo.source.width : 1280;
        const h = firstVideo ? firstVideo.source.height : 720;
        const fps = 30;


        // --- ЛОГИКА ОПРЕДЕЛЕНИЯ HDR ---
        // В идеале нужно прогнать ffprobe, но в ffmpeg.wasm мы можем 
        // ориентироваться на метаданные файла, если они есть. 
        // Для примера предположим наличие флага в объекте track или проверяем по условию
        const isHDRProject = firstVideo?.source?.isHDR || false; 
        const colorTags = getColorParams(isHDRProject);

        const videoParams = [
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '18',
            '-threads', '2',
            ...colorTags
        ];

        let exportWindow = document.getElementById("modal-export-video");
        let windowSucess = new bootstrap.Modal(exportWindow);
        windowSucess.show();

        // Прогресс-элементы в модальном окне
        const progressBar = document.getElementById('export-progress-bar');
        const progressText = document.getElementById('export-progress-text');

        // Обновление прогресса от ffmpeg.wasm (ratio: 0..1)
        ffmpeg.setProgress(({ ratio }) => {
            const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
            if (progressBar) {
                progressBar.style.width = pct + '%';
                progressBar.setAttribute('aria-valuenow', pct);
            }
            if (progressText) progressText.textContent = pct + '%';
        });

        // Логировать ошибки/инфо (опционально можно парсить time/frame)
        ffmpeg.setLogger(({ type, message }) => {
            // типы: 'fferr' / 'ffout' / 'info' и т.д.
            // можно выводить в отдельное поле в модальном окне при необходимости.
            // console.log(type, message);
        });

        // Для HDR в H.264/H.265 нужно передать метаданные в битовый поток
        const hdrBsf = isHDRProject 
            ? ['-bsf:v', 'h264_metadata=video_full_range_flag=0:colour_primaries=9:transfer_characteristics=16:matrix_coefficients=9'] 
            : [];

        const audioParams = ['-c:a', 'aac', '-ar', '44100', '-ac', '2', '-b:a', '128k'];
        const chunkFiles = [];
        const encoder = new TextEncoder();

        try {
            let prevEnd = 0;

            for (let i = 0; i < allTracks.length; i++) {
                const track = allTracks[i];
                const trackName = `chunk_${i}.mp4`;
                const srcName = `src_${i}`;

                // --- ОБРАБОТКА GAP ---
                if (track.start > prevEnd + 0.01) {
                    const gapName = `gap_${i}.mp4`;
                    // Генерируем черный фон с нужными цветовыми параметрами
                    await ffmpeg.run(
                        '-f', 'lavfi', '-i', `color=c=black:s=${w}x${h}:r=${fps}`,
                        '-f', 'lavfi', '-i', `anullsrc=cl=stereo:sr=44100`,
                        '-t', `${track.start - prevEnd}`,
                        ...videoParams, ...audioParams, gapName
                    );
                    chunkFiles.push(gapName);
                }

                // --- ЗАГРУЗКА ИСХОДНИКА ---
                await ffmpeg.FS('writeFile', srcName, await fetchFile(track.source.url));

                let start = track.trimStart || 0;
                let duration = (track.trimEnd - track.trimStart) || track.source.length || 5; 

                const mime = (track.source.file && track.source.file.type) ? track.source.file.type : '';
                const pixelFormat = isHDRProject ? 'yuv420p10le' : 'yuv420p';
                if (mime.startsWith('image')) {
                    await ffmpeg.run(
                        '-loop', '1', '-i', srcName,
                        '-f', 'lavfi', '-i', 'anullsrc',
                        '-t', `${duration}`,
                        // Важно: приводим картинку к тому же формату пикселей, что и видео
                        '-vf', `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,format=${pixelFormat}`,
                        ...videoParams, 
                        ...hdrBsf, // Картинке тоже нужны метаданные, если проект HDR
                        ...audioParams,
                        trackName
                    );
                } else {
                    await ffmpeg.run(
                        '-i', srcName,
                        '-ss', `${start}`, '-t', `${duration}`,
                        // Добавляем принудительный ресайз и приведение цвета для всех видео-исходников
                        '-vf', `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,format=${pixelFormat}`, 
                        '-sn', 
                        ...videoParams,
                        ...hdrBsf,
                        ...audioParams,
                        trackName
                    );
                }

                chunkFiles.push(trackName);
                ffmpeg.FS('unlink', srcName);
                prevEnd = track.start + duration;
            }

            // --- ФИНАЛЬНАЯ СБОРКА ---
            const concatList = chunkFiles.map(name => `file '${name}'`).join('\n');
            ffmpeg.FS('writeFile', 'concat.txt', encoder.encode(concatList));

            // Склеиваем. Если все чанки были созданы с одинаковыми videoParams, copy сработает идеально
            await ffmpeg.run('-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c', 'copy', 'final.mp4');

            // --- СКАЧИВАНИЕ ---
            const data = ffmpeg.FS('readFile', 'final.mp4');
            const link = document.createElement('a');
            link.href = URL.createObjectURL(new Blob([data.buffer], { type: "video/mp4" }));
            link.download = `render_${Date.now()}.mp4`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Очистка
            chunkFiles.forEach(f => { try { ffmpeg.FS('unlink', f); } catch(e){} });
            ffmpeg.FS('unlink', 'concat.txt');
            ffmpeg.FS('unlink', 'final.mp4');

            // завершили — показать 100% и отключить обработчик
            if (progressBar) { progressBar.style.width = '100%'; progressBar.setAttribute('aria-valuenow', '100'); }
            if (progressText) progressText.textContent = '100%';
            ffmpeg.setProgress(() => {}); // сброс (пустая функция)
            ffmpeg.setLogger(() => {});

        } catch (err) {
            console.error('Ошибка:', err);
            alert("Ошибка рендера.");
        } finally {
            setTimeout(() => windowSucess.hide(), 2000);
        }
    });
});


 