const thumbnailCanvas = Elem('canvas');
const thumbnailContext = thumbnailCanvas.getContext('2d');
const thumbnailAudio = Elem('audio');
const audioContext = new AudioContext();

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
        preload: 'auto'
      });
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

    requestThumbnailFrame() {
      if (!this.thumbnailVideo || this._thumbnailCaptured || this._thumbnailRequested) return;
      this._thumbnailRequested = true;

      const duration = Number(this.thumbnailVideo.duration);
      const targetTime = Number.isFinite(duration) && duration > 0
        ? Math.min(Math.max(duration * 0.25, 0.15), Math.max(duration - 0.1, 0))
        : 0;

      const captureOnce = () => this.captureThumbnailFrame();
      const fallbackTimer = setTimeout(() => {
        this.captureThumbnailFrame();
      }, 1200);

      const cleanup = () => {
        clearTimeout(fallbackTimer);
        this.thumbnailVideo?.removeEventListener('seeked', onSeeked);
        this.thumbnailVideo?.removeEventListener('loadeddata', onLoadedData);
        this.thumbnailVideo?.removeEventListener('canplay', onCanPlay);
      };

      const onSeeked = () => {
        cleanup();
        captureOnce();
      };

      const onLoadedData = () => {
        if (targetTime <= 0.001) {
          cleanup();
          captureOnce();
        }
      };

      const onCanPlay = () => {
        if (targetTime <= 0.001) {
          cleanup();
          captureOnce();
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
          captureOnce();
        }
      } catch (error) {
        cleanup();
        this.captureThumbnailFrame();
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
        this.thumbnail = thumbnailCanvas.toDataURL('image/jpeg', 0.82);
      } catch (error) {
        this.thumbnail = this.thumbnail || this.url;
      }

      this._thumbnailCaptured = true;
      this.amReady();
    }

    failSafeReady() {
      if (this._thumbnailCaptured) return;
      this.length = this.length || 5;
      this.thumbnail = this.thumbnail || this.url;
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
