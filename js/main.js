['drag', 'dragstart', 'dragend', 'dragover', 'dragenter', 'dragleave'].forEach(eventType => {
    window.addEventListener(eventType, e => {
      e.preventDefault();
      e.stopPropagation();
    });
  });
  
let exportBitrate = 7.5;
const videoTypes = [
  {name: '2160p (4k) extreme', bitrate: 68, width: 3840, height: 2160},
  {name: '2160p (4k)', bitrate: 53, width: 3840, height: 2160},
  {name: '1440p (4k)', bitrate: 24, width: 2560, height: 1440},
  {name: '1080p', bitrate: 12, width: 1920, height: 1080},
  {name: '720p', bitrate: 7.5, width: 1280, height: 720},
  {name: '480p', bitrate: 4, width: 854, height: 480},
  {name: '360p', bitrate: 1.5, width: 640, height: 360},
  {name: '240p', bitrate: 1, width: 426, height: 240}
];

let currentVideoType = videoTypes[4];
function changeProjectName(name) {
  document.title = name + ' - Forward';
  actualname = name;
}

function setVideoType(type, userChange = true) {
  if (type !== 'custom') {
    if (userChange) log(actions.VIDEO_TYPE);
    selectPreset.textContent = type.name;
    customSizeWrapper.classList.add('hidden');
    exportBitrate = type.bitrate;
    preview.width = type.width;
    preview.height = type.height;
    currentVideoType = type;
    rerender();
  }
  if (type === 'custom' || type.name === 'custom') {
    selectPreset.textContent = 'Custom';
    customSizeWrapper.classList.remove('hidden');
    bitrateInput.value = exportBitrate;
    widthInput.value = preview.width;
    heightInput.value = preview.height;
    currentVideoType = 'custom';
  }
}

const exportTypes = [
  'video/webm',
  'video/webm;codecs=vp8',
  'video/webm;codecs=daala',
  'video/webm;codecs=h264',
  'video/mpeg',
  'video/x-matroska',
  'video/x-matroska;codecs=theora',
  'video/x-matroska;codecs=vorbis',
  'video/x-matroska;codecs=vp8',
  'video/x-matroska;codecs=vp9',
  'video/x-matroska;codecs=av1',
  'video/x-matroska;codecs=H264',
  'video/x-matroska;codecs=MPEG4',
  'video/x-matroska;codecs=opus'
].filter(type => MediaRecorder.isTypeSupported(type));

let usingExportType = exportTypes[exportTypes.length - 5];
document.addEventListener('keydown', e => {
  let preventDefault = true;

  if (e.key === 'ArrowLeft') {

    if (e.shiftKey) setPreviewTime(previewTime - 10);
    else if (e.altKey) setPreviewTime(previewTime - 0.1);
    else setPreviewTime(previewTime - 1);

  } else if (e.key === 'ArrowRight') {

    if (e.shiftKey) setPreviewTime(previewTime + 10);
    else if (e.altKey) setPreviewTime(previewTime + 0.1);
    else setPreviewTime(previewTime + 1);

  } else if (e.key === ' ') {
    playButton.click();
    
  } else if (e.key === '-') {
    zoomOutBtn.click();

  } else if (e.key === '=' || e.key === '+') {
    zoomInBtn.click();

  } else if (e.key === "Delete") {
		if (Track.selected) Track.selected.remove("delete");

	} else if (e.key === "c" || e.key === "C" || e.key === "с" || e.key === "С")  {
		if (Track.selected) Track.selected.splitAt(previewTime - Track.selected.start);

  } else if (e.key == "v" || e.key == "V" || e.key === "м" || e.key === "М"){
      Track.selected.unselected()

	} else {
		preventDefault = false;
	}

  if (preventDefault) e.preventDefault();
});