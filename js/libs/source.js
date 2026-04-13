const thumbnailCanvas = Elem('canvas');
const thumbnailContext = thumbnailCanvas.getContext('2d');
const thumbnailAudio = Elem('audio');
const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
const audioContext = AudioContextClass ? new AudioContextClass() : null;

function waitForDecodedVideoFrame(video, timeout = 1000) {
  return new Promise(resolve => {
    if (!video) {
      resolve();
      return;
    }

    let settled = false;
    let timeoutId = null;
    let rvfcId = null;

    const cleanup = () => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('seeked', onReady);
      if (rvfcId !== null && typeof video.cancelVideoFrameCallback === 'function') {
        try { video.cancelVideoFrameCallback(rvfcId); } catch (error) {}
      }
      resolve();
    };

    const onReady = () => {
      if (typeof video.requestVideoFrameCallback === 'function') {
        try {
          rvfcId = video.requestVideoFrameCallback(() => cleanup());
          return;
        } catch (error) {}
      }

      requestAnimationFrame(() => cleanup());
    };

    timeoutId = setTimeout(cleanup, timeout);

    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      onReady();
      return;
    }

    video.addEventListener('loadeddata', onReady, { once: true });
    video.addEventListener('canplay', onReady, { once: true });
    video.addEventListener('seeked', onReady, { once: true });
  });
}

async function warmupVideoForCanvas(video) {
  if (!video) return;
  const prevMuted = video.muted;
  video.muted = true;
  if (video.readyState >= 2 && video.currentTime > 0) {
    await waitForDecodedVideoFrame(video, 350);
    video.muted = prevMuted;
    return;
  }

  try {
    const playPromise = video.play();
    if (playPromise && typeof playPromise.then === 'function') {
      await playPromise.catch(() => {});
    }
  } catch (error) {}

  await waitForDecodedVideoFrame(video, 350);

  try { video.pause(); } catch (error) {}
  video.muted = prevMuted;
}

class Source {

    constructor(file, id) {
      this.file = file;
      this.url = URL.createObjectURL(file);
      // if id provided (uploadId) — use it as unique id and keep file.name as display name.
      if (id) {
        this.id = id;
        this.name = file.name;
      } else {
        this.name = file.name;
        this.id = Math.random().toString(36).slice(2) + '-' + file.name;
      }
      this.tracks = [];
      // Try reuse existing preview element created by addButtonNormal (matching data-upload-id).
      const filesContainer = document.getElementById("files-users-click");
      if (filesContainer && id) {
        const existing = filesContainer.querySelector(`[data-upload-id="${id}"]`);
        if (existing) {
          this.elem = existing;
          // mark bound to avoid duplicate use
          this.elem.dataset.sourceBound = this.id;
          // ensure class names expected by rest of app
          this.elem.classList.add('source');
        }
      }
      // if no existing element found — create new one (fallback)
      if (!this.elem) {
        this.elem = Elem('div', {
          className: 'source disabled',
          tabIndex: 0,
          oncontextmenu: e => {
            try { sourceMenu.items[1].disabled = this.tracks.length; } catch (err) {}
            try { sourceMenu.open(e.clientX, e.clientY, this); } catch (err) {}
          }
        }, [
          Elem('span', { className: 'name' }, [ this.name ])
        ]);
        if (filesContainer) {
          filesContainer.appendChild(this.elem);
          this.elem.dataset.sourceBound = this.id;
        } else {
          console.warn('files-users-click container not found; source element created but not appended');
        }
      }
      isDragTrigger(this.elem, (e, switchControls) => {
        const track = this.createTrack();
        track.dragStart(e, [5, 5], true);
        switchControls([track.dragMove, track.dragEnd]);
      });
  
      this.ready = new Promise(res => this.amReady = res)
        .then(() => {
          this.elem.classList.remove('disabled');
          this.elem.style.backgroundImage = `url(${encodeURI(this.thumbnail)})`;
          this.tracks.forEach(track => {
            if (track?.elem) {
              track.elem.style.backgroundImage = `url(${encodeURI(this.thumbnail)})`;
            }
          });
        });
    }
  
    remove() {
      delete sources[this.id];
      if (this.elem.parentNode) this.elem.parentNode.removeChild(this.elem);
      // this class tends to have big data in it, so this tries to get rid of them just in case
      for (const prop in this) this[prop] = null;
    }
  
    toJSON() {
      return {id: this.id, type: this.file.type};
    }
  
  }
  
  class VideoSource extends Source {
  
    constructor(...args) {
      super(...args);
      this.elem.classList.add('video');
      this.thumbnailVideo = Elem('video', {
        src: this.url,
        muted: true,
        playsInline: true,
        preload: 'auto',
        crossOrigin: 'anonymous'
      });
      this.thumbnailVideo.setAttribute('webkit-playsinline', 'true');
      this.thumbnailVideo.addEventListener('loadedmetadata', () => this.onVideoMetadata());
      this.thumbnailVideo.addEventListener('error', () => this.failSafeReady(), { once: true });
    }

    onVideoMetadata() {
      const duration = Number(this.thumbnailVideo.duration);
      if (Number.isFinite(duration) && duration > 0) {
        this.length = duration;
      } else {
        this.length = this.length || 5;
      }

      this.requestThumbnailFrame();
    }

    async requestThumbnailFrame() {
      if (!this.thumbnailVideo || this._thumbnailCaptured || this._thumbnailRequested) return;
      this._thumbnailRequested = true;

      const duration = Number(this.thumbnailVideo.duration);
      const targetTime = Number.isFinite(duration) && duration > 0
        ? Math.min(Math.max(duration * 0.25, 0.15), Math.max(duration - 0.1, 0))
        : 0;

      const captureOnce = async () => {
        await waitForDecodedVideoFrame(this.thumbnailVideo, 500);
        this.captureThumbnailFrame();
      };
      const fallbackTimer = setTimeout(() => {
        captureOnce();
      }, 1200);

      const cleanup = () => {
        clearTimeout(fallbackTimer);
        this.thumbnailVideo?.removeEventListener('seeked', onSeeked);
        this.thumbnailVideo?.removeEventListener('loadeddata', onLoadedData);
        this.thumbnailVideo?.removeEventListener('canplay', onCanPlay);
      };

      const onSeeked = async () => {
        cleanup();
        await captureOnce();
      };

      const onLoadedData = async () => {
        if (targetTime <= 0.001) {
          cleanup();
          await captureOnce();
        }
      };

      const onCanPlay = async () => {
        if (targetTime <= 0.001) {
          cleanup();
          await captureOnce();
        }
      };

      this.thumbnailVideo.addEventListener('seeked', onSeeked, { once: true });
      this.thumbnailVideo.addEventListener('loadeddata', onLoadedData, { once: true });
      this.thumbnailVideo.addEventListener('canplay', onCanPlay, { once: true });

      try {
        if (targetTime > 0.001) {
          this.thumbnailVideo.currentTime = targetTime;
        } else if (this.thumbnailVideo.readyState >= 2) {
          cleanup();
          await captureOnce();
        }
      } catch (error) {
        cleanup();
        await captureOnce();
      }
    }

    captureThumbnailFrame() {
      if (!this.thumbnailVideo || this._thumbnailCaptured) return;

      const videoWidth = this.thumbnailVideo.videoWidth || 320;
      const videoHeight = this.thumbnailVideo.videoHeight || 180;

      this.width = thumbnailCanvas.width = videoWidth;
      this.height = thumbnailCanvas.height = videoHeight;

      try {
        thumbnailContext.clearRect(0, 0, videoWidth, videoHeight);
        thumbnailContext.drawImage(this.thumbnailVideo, 0, 0, videoWidth, videoHeight);
        const pixel = thumbnailContext.getImageData(
          Math.max(0, Math.floor(videoWidth / 2) - 1),
          Math.max(0, Math.floor(videoHeight / 2) - 1),
          1,
          1
        ).data;
        const looksBlack = pixel[0] < 4 && pixel[1] < 4 && pixel[2] < 4 && pixel[3] > 0;

        if (looksBlack && !this._thumbnailWarmupTried) {
          this._thumbnailWarmupTried = true;
          warmupVideoForCanvas(this.thumbnailVideo).then(() => {
            if (!this._thumbnailCaptured) this.captureThumbnailFrame();
          });
          return;
        }

        this.thumbnail = thumbnailCanvas.toDataURL('image/jpeg', 0.82);
      } catch (error) {
        this.thumbnail = this.thumbnail || '';
      }

      this._thumbnailCaptured = true;
      this.amReady();
    }

    failSafeReady() {
      if (this._thumbnailCaptured) return;
      this.length = this.length || 5;
      this.thumbnail = this.thumbnail || '';
      this._thumbnailCaptured = true;
      this.amReady();
    }
  
    createTrack() {
      return new VideoTrack(this);
    }
  
  }
  
  class ImageSource extends Source {
  
    constructor(...args) {
      super(...args);
      this.elem.classList.add('image');
      this.thumbnail = this.url;
      // default duration for images so tracks get reasonable length on timeline and playback
      this.length = this.length || 5; // seconds
      this.image = new Image();
      this.image.onload = e => {
        this.width = this.image.width;
        this.height = this.image.height;
        this.amReady();
      };
      this.image.src = this.url;
    }
  
    createTrack() {
      return new ImageTrack(this);
    }
  
  }
  
  const HEIGHT = 100;
const CHUNK_SIZE = 1024;
class AudioSource extends Source {

  constructor(...args) {
    super(...args);
    this.elem.classList.add('audio');
    if (!audioContext) {
      this.length = this.length || 5;
      this.thumbnail = '';
      this.amReady();
      return;
    }
    fetch(this.url)
      .then(r => r.arrayBuffer())
      .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        this.length = audioBuffer.duration;
        const samples = audioBuffer.getChannelData(0);
        let chunk = samples.length / CHUNK_SIZE > 1000 ? Math.floor(samples.length / 1000) : CHUNK_SIZE;
        thumbnailCanvas.width = Math.ceil(samples.length / chunk);
        thumbnailCanvas.height = HEIGHT;
        thumbnailContext.fillStyle = 'rgba(255, 255, 255, 0.5)';
        // calculates an RMS, according to Wikipedia
        // why RMS? idk, that's what Scratch did though
        // I don't even know what an RMS is
        for (let i = 0; i * chunk < samples.length; i++) {
          let sum = 0, n;
          for (n = 0; n < chunk && i * chunk + n < samples.length; n++) {
            sum += samples[i * chunk + n] * samples[i * chunk + n];
          }
          const rms = Math.sqrt(sum / n);
          thumbnailContext.fillRect(i, (1 - rms) * HEIGHT, 1, rms * HEIGHT);
        }
        this.thumbnail = thumbnailCanvas.toDataURL();
        this.amReady();
      });
  }

  createTrack() {
    return new AudioTrack(this);
  }

}
  
  function toSource(mime) {
    const [type] = mime.split('/');
    switch (type) {
      case 'video':
        return VideoSource;
      case 'image':
        return ImageSource;
      case 'audio':
        return AudioSource;
    }
  }
