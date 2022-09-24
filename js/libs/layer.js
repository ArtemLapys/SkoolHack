class Layer {

    constructor() {
      this.elem = Elem('div', {
        className: 'layer',
        /*oncontextmenu: e => {
          if (e.target === this.elem) {
            layerMenu.items[0].disabled = this.index === 0;
            layerMenu.items[1].disabled = this.index === layers.length - 1;
            layerMenu.items[4].disabled = this.index === layers.length - 1 && !this.tracks.length;
            layerMenu.open(e.clientX, e.clientY, this);
          }
        }*/
      });
      this.removeBox = Elem('div', {
        className: 'remove'
      });
      let initX, min, max, jumpPoints;
      isDragTrigger(this.elem, (e, switchControls) => {
        if (e.ctrlKey) {
          jumpPoints = getAllJumpPoints();
          initX = e.clientX;
          min = max = initX;
          this.removeBox.style.left = initX * scale + 'px';
          this.removeBox.style.width = 0;
          this.elem.appendChild(this.removeBox);
        } else {
          switchControls(null);
        }
      }, e => {
        let point = (e.clientX + scrollX - LEFT);
        if (!e.shiftKey) point = Track.snapPoint(jumpPoints, point);
        min = Math.min(point, initX);
        max = Math.max(point, initX);
        this.removeBox.style.left = min * scale + 'px';
        this.removeBox.style.width = (max - min) * scale + 'px';
      }, e => {
        this.elem.removeChild(this.removeBox);
        const tracks = this.tracksBetween(min, max);
        if (tracks.length) {
          log(actions.RANGE_DELETE);
          tracks.forEach(track => {
            if (track.start >= min && track.end < max) {
              track.remove('range-delete');
            } else {
              if (track.start < min) {
                if (track.end > max) {
                  track.splitAt(max - track.start, false);
                }
                track.length = Math.max(min, track.start + MIN_LENGTH) - track.start;
              } else {
                track.setLeftSide(Math.min(max, track.end - MIN_LENGTH));
              }
              track.updateLength();
            }
          });
        }
      });
      this.tracks = [];
    }
  
    tracksBetween(min, max) {
      return this.tracks.filter(({start, end}) => start < max && end > min);
    }
  
    trackAt(time) {
      return this.tracks.find(({start, end}) => time >= start && time < end);
    }
  
    // assumes track.start is set, or should that be an argument?
    addTrack(track) {
      track.layer = this;
      const index = this.tracks.findIndex(({start}) => track.start < start);
      this.tracks.splice(~index ? index : this.tracks.length, 0, track);
      this.elem.appendChild(track.elem);
      this.updateTracks();
      if (this.tracks.length === 1 && this.index === layers.length - 1) {
        // always have an extra layer available
        addLayer();
      }
    }
  
    updateTracks() {
      this.tracks.forEach((track, i) => {
        track.index = i;
      });
    }
  
    updateScale() {
      this.tracks.forEach(track => {
        track.updateScale();
      });
    }
  
    getJumpPoints() {
      const arr = [];
      this.tracks.forEach(track => {
        arr.push(track.start);
        arr.push(track.end);
        Object.values(track.keys).forEach(keys => arr.push(...keys.map(({time}) => track.start + time)));
        if (track.trimEnd !== undefined) {
          const start = Math.ceil(track.trimStart / track.source.length);
          const end = Math.floor(track.trimEnd / track.source.length);
          for (let i = start; i <= end; i++) {
            arr.push(track.start + i * track.source.length - track.trimStart);
          }
        }
      });
      return arr;
    }
  
    insertBefore(layer = new Layer()) {
      layersWrapper.insertBefore(layer.elem, this.elem);
      layers.splice(this.index, 0, layer);
      updateLayers();
    }
  
    addAudioTracksTo(dest) {
      return this.tracks.map(track => {
        if (track.media) {
          if (!track.audioSource) {
            track.audioSource = audioContext.createMediaElementSource(track.media);
            track.audioSource.connect(audioContext.destination);
          }
          track.audioSource.connect(dest);
          return track.audioSource;
        }
      });
    }
  
    remove(removeTracks = true) {
      if (removeTracks) this.tracks.forEach(track => track.remove('layer-removal'));
      layers.splice(this.index, 1);
      layersWrapper.removeChild(this.elem);
    }
  
  }