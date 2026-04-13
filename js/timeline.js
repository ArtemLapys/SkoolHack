const scrollWrapper = document.getElementById('scroll');
const timeMarkers = document.getElementById('axis');
const layersContainer = document.getElementById('layers');
const playheadMarker = document.getElementById('playhead');
const playButton = document.getElementById('play');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const timelineTimeDisplay = document.getElementById('timeline-time-display');

function translateUi(key, fallback) {
  return globalThis.i18n?.t?.(key, {}, fallback) || fallback;
}

const playIcon = playButton.firstChild;
const LEFT_PADDING = 5;
var LEFT = scrollWrapper.getBoundingClientRect().left

function resumeTimelineAudio() {
  if (!globalThis.audioContext || typeof globalThis.audioContext.resume !== 'function') return;
  if (globalThis.audioContext.state === 'running') return;
  globalThis.audioContext.resume().catch(() => {});
}

globalThis.resumeTimelineAudio = resumeTimelineAudio;

const BASE_SCALE = 3;
const MAX_SCALE = 5;
let logScale = 1, scale = BASE_SCALE * 2 ** logScale;

let windowWidth = window.innerWidth, windowHeight = window.innerHeight;
window.addEventListener('resize', e => {
  windowWidth = window.innerWidth;
  windowHeight = window.innerHeight;
  renderScale();
  syncStickyTimelineAxis();
});

function formatTimelineTime(totalSeconds = 0) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = String(Math.floor(safeSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((safeSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(safeSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function updateTimelineTimeDisplay(time = 0) {
  if (timelineTimeDisplay) {
    timelineTimeDisplay.textContent = formatTimelineTime(time);
  }
}

function syncStickyTimelineAxis() {
  if (!scrollWrapper || !timeMarkers) return;

  const rect = scrollWrapper.getBoundingClientRect();
  const axisHeight = timeMarkers.offsetHeight || 34;
  const shouldStick = rect.top <= 0 && rect.bottom - axisHeight > 0;
  const timelineWidth = Math.max(
    layersContainer?.scrollWidth || 0,
    layersContainer?.offsetWidth || 0,
    scrollWrapper.clientWidth
  );

  timeMarkers.classList.toggle('timeline-axis-fixed', shouldStick);

  if (shouldStick) {
    timeMarkers.style.top = '0';
    timeMarkers.style.left = `${rect.left - scrollWrapper.scrollLeft}px`;
    timeMarkers.style.width = `${timelineWidth}px`;
    timeMarkers.style.transform = '';
  } else {
    timeMarkers.style.top = '';
    timeMarkers.style.left = '';
    timeMarkers.style.width = `${timelineWidth}px`;
    timeMarkers.style.transform = '';
  }
}

function renderScale() {
  while (timeMarkers.firstChild) timeMarkers.removeChild(timeMarkers.firstChild);

  const viewportWidth = scrollWrapper?.clientWidth || windowWidth;
  const bufferedViewportWidth = viewportWidth * 1.5;
  const majorStep = 20 * 2 ** (-logScale);
  const step = 2 * 2 ** (-logScale);
  const minVisiblePx = Math.max(scrollX - bufferedViewportWidth, 0);
  const maxVisiblePx = scrollX + viewportWidth + bufferedViewportWidth;
  const minTime = Math.floor(minVisiblePx / scale / step) * step;
  const projectDuration = Math.max(Number(editorLength) || 0, previewTime || 0);
  const projectDurationWithPadding = projectDuration + majorStep * 2;
  const maxTime = Math.max(
    Math.ceil(maxVisiblePx / scale / step) * step,
    Math.ceil(projectDurationWithPadding / step) * step
  );

  for (let t = Math.max(minTime, 0); t <= maxTime; t += step) {
    timeMarkers.appendChild(Elem('span', {
      className: ['marker', t % majorStep === 0 ? 'major' : null],
      style: {
        left: t * scale + 'px'
      }
    }, [t % majorStep === 0 ? t + 's' : '']));
  }

  const timelineWidth = Math.max(maxTime * scale, viewportWidth);
  layersContainer.setAttribute("style", `width: ${timelineWidth}px;`)
  timeMarkers.style.width = `${timelineWidth}px`;
  syncStickyTimelineAxis();
}
window.requestAnimationFrame(renderScale);

let scrollX = scrollWrapper.scrollLeft, scrollY = scrollWrapper.scrollTop;
scrollWrapper.addEventListener('scroll', e => {
  scrollX = scrollWrapper.scrollLeft;
  scrollY = scrollWrapper.scrollTop;
  renderScale();
  syncStickyTimelineAxis();
});

window.addEventListener('scroll', syncStickyTimelineAxis, { passive: true });

let previewTimeReady;
function previewTimeAt(time = previewTime, prepare = true) {
  if (time < 0) time = 0;
  previewTime = time;
  playheadMarker.style.left = time * scale + 'px';
  updateTimelineTimeDisplay(time);

  if (prepare) {
    previewTimeReady = Promise.all(layers.map(layer => {
      const track = layer.trackAt(time);
      if (track) {
        return track.prepare(time - track.start);
      }
    }));
    previewTimeReady.then(rerender);
  }
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
syncStickyTimelineAxis();

let playing = false;
async function play(exporting = false) {
  if (playing) return;
  resumeTimelineAudio();
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
  playButton.title = translateUi('toolbar.pauseTitle', 'Приостановить');
  paint();
}

let nextAnimationFrame;
function paint() {
  if (!playing) return;

  nextAnimationFrame = window.requestAnimationFrame(paint);
  previewTimeAt((Date.now() - playing.start) / 1000 + playing.startTime, false);
  c.clearRect(0, 0, c.canvas.width, c.canvas.height);

  [...layers].reverse().forEach(layer => {
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
  playButton.title = translateUi('toolbar.playTitle', 'Проигрывать');
  window.cancelAnimationFrame(nextAnimationFrame);
}

window.addEventListener('vigu:languagechange', () => {
  if (!playing) {
    playButton.title = translateUi('toolbar.playTitle', 'Проигрывать');
  } else {
    playButton.title = translateUi('toolbar.pauseTitle', 'Приостановить');
  }
});
