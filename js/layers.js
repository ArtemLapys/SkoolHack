const layersWrapper = document.getElementById('layers');
const layers = [];

function updateLayers() {
  layers.forEach((layer, i) => {
    layer.index = i;
  });
}

function addLayer(layer = new Layer()) {
    layersWrapper.appendChild(layer.elem);
    layers.push(layer);
    updateLayers();
  }

function updateScale(newScale) {
    scale = newScale;
    layers.forEach(layer => layer.updateScale());
    renderScale();
    playheadMarker.style.left = previewTime * scale + 'px';
    scrollWrapper.scrollLeft = previewTime * scale - (windowWidth - LEFT) / 2; // could improve
    zoomOutBtn.disabled = logScale === 0;
    zoomInBtn.disabled = logScale === MAX_SCALE;
  }