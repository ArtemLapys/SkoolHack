const scrollWrapper = document.getElementById('scroll');
const timeMarkers = document.getElementById('axis');
const playheadMarker = document.getElementById('playhead');
const playButton = document.getElementById('play');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const playIcon = playButton.firstChild;
//const currentSpan = document.getElementById('current');
const LEFT_PADDING = 5;
var LEFT = scrollWrapper.getBoundingClientRect().left

const BASE_SCALE = 3;
const MAX_SCALE = 5;
let logScale = 1, scale = BASE_SCALE * 2 ** logScale;

let windowWidth = window.innerWidth, windowHeight = window.innerHeight;
window.addEventListener('resize', e => {
  windowWidth = window.innerWidth;
  windowHeight = window.innerHeight;
  renderScale();
});

function renderScale() {
  while (timeMarkers.firstChild) timeMarkers.removeChild(timeMarkers.firstChild);
  const majorStep = 20 * 2 ** (-logScale);
  const step = 2 * 2 ** (-logScale);
  const minTime = Math.floor((scrollX - LEFT) / scale / step) * step;
  const maxTime = Math.ceil((scrollX + windowWidth) / scale / step) * step;
  for (let t = Math.max(minTime, 0); t <= maxTime; t += step) {
    timeMarkers.appendChild(Elem('span', {
      className: ['marker', t % majorStep === 0 ? 'major' : null],
      style: {
        left: t * scale + 'px'
      }
    }, [t % majorStep === 0 ? t + 's' : '']));
  }
  document.getElementById("layers").setAttribute("style", `width: ${maxTime*scale}px;`)
}
window.requestAnimationFrame(renderScale);

//увеличение таймлайна при смещении ползунка внизу
let scrollX = scrollWrapper.scrollLeft, scrollY = scrollWrapper.scrollTop;
scrollWrapper.addEventListener('scroll', e => {
  scrollX = scrollWrapper.scrollLeft;
  scrollY = scrollWrapper.scrollTop;
  renderScale();
});

let previewTimeReady;
// use `setPreviewTime` if you want to set it while playing
function previewTimeAt(time = previewTime, prepare = true) {
  if (time < 0) time = 0;
  previewTime = time;
  playheadMarker.style.left = time * scale + 'px';
  //currentSpan.textContent = Math.floor(previewTime / 60) + ':' + ('0' + Math.floor(previewTime % 60)).slice(-2);
  if (prepare) {
    previewTimeReady = Promise.all(layers.map(layer => {
      const track = layer.trackAt(time);
      if (track) {
        return track.prepare(time - track.start);
      }
    }));
    previewTimeReady.then(rerender);
  }
  //if (Track.selected) Track.selected.displayProperties();
}

function updateLEFT() {
  LEFT = scrollWrapper.getBoundingClientRect().left + LEFT_PADDING;
}

let previewTime, wasPlaying, editorLength;
isDragTrigger(scrollWrapper, (e, switchControls) => {
  updateLEFT();
  const closest = e.target.closest('.track');
  if (closest && !closest.classList.contains('selected')) {
    switchControls(null);
  } else {
    if (playing) {
      wasPlaying = true;
      stop();
    } else {
      wasPlaying = false;
    }
    if (Track.selected && !closest) {
      Track.selected.unselected();
    }
    window.requestAnimationFrame(() => {
      previewTimeAt((e.clientX + scrollX - LEFT) / scale, 0);
      //console.log(LEFT)
      //console.log(Math.max((e.clientX + scrollX - LEFT) / scale, 0).toString());
    });
  }
}, e => {
  previewTimeAt(Math.max((e.clientX + scrollX - LEFT) / scale, 0));
}, e => {
  if (wasPlaying) play();
});
const OFFSCREEN_PADDING = 20;
function setPreviewTime(time, scrollTo = true) {
  let wasPlaying = playing;
  if (wasPlaying) stop();
  previewTimeAt(time);
  if (scrollTo) {
    if (previewTime < (scrollX - LEFT + OFFSCREEN_PADDING) / scale
      || previewTime > (scrollX + windowWidth - LEFT - OFFSCREEN_PADDING) / scale) {
      scrollWrapper.scrollLeft = previewTime * scale - (windowWidth - LEFT) / 2;
    }
  }
  if (wasPlaying) play();
}
previewTimeAt(0);

addLayer();


let playing = false;
async function play(exporting = false) {
  if (playing) return;
  await Promise.all(layers.map(layer => {
    layer.playing = layer.trackAt(previewTime);
    return Promise.all(layer.tracks.map(track => {
      return track === layer.playing
        ? track.prepare(previewTime - track.start).then(() => {
          track.render(c, previewTime - track.start, true);
        })
        : track.prepare(0);
    }));
  }));
  playing = {
    start: Date.now(),
    startTime: previewTime,
    exporting
  };
  playIcon.textContent = 'pause_circle';
  playButton.title = "Приостановить";
  paint();
}
let nextAnimationFrame;
function paint() {
  if (!playing) return;
  nextAnimationFrame = window.requestAnimationFrame(paint);
  previewTimeAt((Date.now() - playing.start) / 1000 + playing.startTime, false);
  c.clearRect(0, 0, c.canvas.width, c.canvas.height);
  layers.forEach(layer => {
    const track = layer.trackAt(previewTime);
    if (track) {
      if (layer.playing === track) {
        track.render(c, previewTime - track.start);
      } else {
        if (layer.playing) layer.playing.stop();
        track.render(c, previewTime - track.start, true);
        layer.playing = track;
      }
    } else if (layer.playing) {
      layer.playing.stop();
      layer.playing = null;
    }
  });
  if (playing.exporting && previewTime > editorLength) {
    playing.exporting(true);
    stop();
  }
}
function stop() {
  layers.forEach(layer => {
    if (layer.playing) {
      layer.playing.stop();
      layer.playing = null;
    }
  });
  playing = false;
  playIcon.textContent = 'play_circle';
  playButton.title="Проигрывать";
  window.cancelAnimationFrame(nextAnimationFrame);
}