class Layer {

    constructor() {
      this.elem = Elem('div', {
        className: 'layer',
        oncontextmenu: e => {
          if (e.target === this.elem) {
            layerMenu.items[0].disabled = this.index === 0;
            layerMenu.items[1].disabled = this.index === layers.length - 1;
            layerMenu.items[4].disabled = this.index === layers.length - 1 && !this.tracks.length;
            layerMenu.open(e.clientX, e.clientY, this);
          }
        }
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
    insertAfter(layer = new Layer()) {
      layers[layer.index + 1].insertBefore(layer.elem, this.elem);
      layers.splice(this.index + 1, 0, layer);
      if (layer.index + 1 == layers.length) addLayer()
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
  
  function getEntry() {
    return {
      layers: layers.map(layer => layer.tracks.map(track => track.toJSON())),
      type: currentVideoType === 'custom' ? {
        name: 'custom',
        width: preview.width,
        height: preview.height,
        bitrate: exportBitrate,
      } : currentVideoType,
      format: usingExportType
    };
  }
  
  function setEntry(entry) {
    const {layers, type, format} = entry.layers ? entry : {
      ...getEntry(),
      layers: entry
    };
    clearLayers();
    layers.forEach(tracks => {
      const layer = new Layer();
      tracks.forEach(data => {
        const track = sources[data.source].createTrack();
        track.setProps(data);
        track.updateLength();
        layer.addTrack(track);
        if (data.selected) track.selected();
      });
      addLayer(layer);
    });
    setVideoType(type, false);
    usingExportType = format;
    selectEncode.textContent = format;
    rerender();
  }
  
  // made such that the bounds should be subtracted by the scrollY
function getLayerBounds() {
  return layers.map(layer => {
    const {top, bottom} = layer.elem.getBoundingClientRect();
    return {layer, top: top + scrollY, bottom: bottom + scrollY};
  });
}

function getAllJumpPoints() {
  const arr = [];
  layers.forEach(layer => arr.push(...layer.getJumpPoints()));
  //if (!playing) arr.push(previewTime);
  arr.sort((a, b) => a - b);
  return arr.filter((t, i) => t !== arr[i + 1]);
}

async function rerender() {
  await previewTimeReady;
  c.clearRect(0, 0, c.canvas.width, c.canvas.height);
  let length = 0;
  layers.forEach(layer => {
    if (layer.tracks.length) {
      const lastTrack = layer.tracks[layer.tracks.length - 1];
      if (lastTrack.end > length) {
        length = lastTrack.end;
      }
    }
    const track = layer.trackAt(previewTime);
    if (track) {
      track.render(c, previewTime - track.start);
      return track;
    }
  });
  editorLength = length;
  //lengthSpan.textContent = Math.floor(length / 60) + ':' + ('0' + Math.floor(length % 60)).slice(-2);
}