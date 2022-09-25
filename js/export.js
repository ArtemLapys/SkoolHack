const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });
ffmpeg.load();

document.querySelectorAll(".export").forEach(element => {
    element.addEventListener("click", async (e) => {
        const inputPaths = [];
        //for(const layer of layers) {
            const layer = layers[0];
            let lastEnd = 0;
            for (const track of layer.tracks) {
                const name = `${track.source.id.replace(' ', '_')}_${layer.index}_${track.index}`;
                
                /*
                if (lastEnd != track.start) {
                    //await ffmpeg.run('-f', 'lavfi', '-i', `color=black:s=${track.source.width}x${track.source.height}:r=60`, '-t', '5', '-x264opts', 'stitchable', '-an', 'black.mp4');
                    ffmpeg.FS('writeFile', 'black.mp4', await fetchFile(`http://${location.host}/media/BlackScreen.mp4`));
                    let time = track.start - lastEnd;
                    ffmpeg.FS('writeFile', `black_loop.txt`, `file black.mp4\n`.repeat(Math.ceil(time / 10)));
                    await ffmpeg.run('-f', 'concat', '-safe', '0', '-i', `black_loop.txt`, '-c', 'copy', `black_looped.mp4`);
                    await ffmpeg.run('-ss', `0`, '-to', `${time}`, '-i', `black_looped.mp4`, '-c', 'copy', `${name}_black.mp4`);
                    inputPaths.push(`file ${name}_black.mp4`);
                    ffmpeg.FS('unlink', 'black.mp4');
                    ffmpeg.FS('unlink', 'black_looped.mp4');
                }
                lastEnd = track.end;
                */
                
                let loop = 0;
                let start = track.trimStart;
                let end = track.trimEnd;
                let lengthS = 0;
                if (start < 0) {
                    do {
                        loop++;
                        lengthS += track.source.length;
                    } while (lengthS < Math.abs(start))
                    start = lengthS - Math.abs(start);
                }
                let lengthE = track.source.length;
                if (lengthE < end) {
                    while (lengthE < end) {
                        loop++;
                        lengthE += track.source.length;
                    }
                    end = lengthS + end;
                }
                
                ffmpeg.FS('writeFile', name, await fetchFile(track.source.url));
                ffmpeg.FS('writeFile', `${name}_loop.txt`, `file ${name}\n`.repeat(loop + 1));
                //await ffmpeg.run('-i', name, '-vf', 'scale=1920:-1', '-c:a', 'copy', `${name}.mp4`);
                await ffmpeg.run('-f', 'concat', '-safe', '0', '-i', `${name}_loop.txt`, '-c', 'copy', `${name}_looped.mp4`);
                await ffmpeg.run('-ss', `${start}`, '-to', `${end}`, '-i', `${name}_looped.mp4`, '-c', 'copy', `${name}_out.mp4`);
                //ffmpeg.FS('unlink', name);
                inputPaths.push(`file ${name}_out.mp4`);
            }
        //}
        ffmpeg.FS('writeFile', 'concat_list.txt', inputPaths.join('\n'));
        await ffmpeg.run('-f', 'concat', '-safe', '0', '-i', 'concat_list.txt', '-c', 'copy', 'output.mp4');
        const data = ffmpeg.FS('readFile', 'output.mp4');
        const link = document.createElement('a');
        link.href = URL.createObjectURL(
          new Blob([data.buffer], {
            type: "video/mp4"
          })
        );
        link.download = Date.now() + ".mp4";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});