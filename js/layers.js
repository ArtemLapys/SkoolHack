const playback = document.getElementById("playback");
const c = playback.getContext("2d");
const layersWrapper = document.getElementById("layers");
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
	layers.forEach((layer) => layer.updateScale());
	renderScale();
	playheadMarker.style.left = previewTime * scale + "px";
	scrollWrapper.scrollLeft = previewTime * scale - (windowWidth - LEFT) / 2; // could improve
	zoomOutBtn.disabled = logScale === 0;
	zoomInBtn.disabled = logScale === MAX_SCALE;
}

const tollbar = document.getElementById("toolbar");

let exportedURL;
function exportVideo() {
	// reduce lag by hiding some things
	if (playing) stop();
	if (Track.selected) Track.selected.unselected();
	if (easingEditor.isOpen) easingEditor.close();
	document.body.classList.add("exporting");

	const stream = playback.captureStream();
	const dest = audioContext.createMediaStreamDestination();
	const sources = []
		.concat(...layers.map((layer) => layer.addAudioTracksTo(dest)))
		.filter((source) => source);
	// exporting doesn't work if there's no audio and it adds the tracks
	if (sources.length) {
		dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
	}
	const recorder = new MediaRecorder(stream, {
		mimeType: usingExportType,
		videoBitsPerSecond: exportBitrate * 1000000,
	});

	let download = true;
	recorder.addEventListener("dataavailable", (e) => {
		const newVideo = document.createElement("video");
		exportedURL = URL.createObjectURL(e.data);
		if (download) {
			const saveLink = document.createElement("a");
			saveLink.href = exportedURL;
			if (actualname !== "") {
				// find the project video extension (e.g video/x-matroska) is .mkv
				const ext = usingExportType.split("/")[1];
				if (ext.includes("webm")) {
					saveLink.download = actualname + ".webm";
				} else if (ext.includes("mpeg")) {
					saveLink.download = actualname + ".mp4";
				} else if (ext.includes("x-matroska")) {
					saveLink.download = actualname + ".mkv";
				}
			} else {
				saveLink.download = "forward-export.webm";
			}
			document.body.appendChild(saveLink);
			saveLink.click();
			document.body.removeChild(saveLink);
		}
	});

	previewTimeAt(0, false);

	return new Promise((res) => {
		recorder.start();
		audioContext.resume().then(() => play(res));
	}).then((successful) => {
		download = successful;
		recorder.stop();
		document.body.classList.remove("exporting");
		sources.forEach((source) => {
			source.disconnect(dest);
		});
	});
}
