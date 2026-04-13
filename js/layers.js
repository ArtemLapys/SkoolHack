const playback = document.getElementById("playback");
const c = playback.getContext("2d");
const layersWrapper = document.getElementById("layers");
const layers = [];
window.layers = layers;

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
	if (globalThis.easingEditor?.isOpen) globalThis.easingEditor.close();
	document.body.classList.add("exporting");

	const projectName = typeof globalThis.actualname === 'string' ? globalThis.actualname : '';

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

	previewTimeAt(0, false);

	const dataReady = new Promise((resolve, reject) => {
		recorder.addEventListener("dataavailable", (e) => {
			try {
				exportedURL = URL.createObjectURL(e.data);
				if (download) {
					const saveLink = document.createElement("a");
					saveLink.href = exportedURL;
					if (projectName !== "") {
						const ext = usingExportType.split("/")[1];
						if (ext.includes("webm")) {
							saveLink.download = projectName + ".webm";
						} else if (ext.includes("mpeg")) {
							saveLink.download = projectName + ".mp4";
						} else if (ext.includes("x-matroska")) {
							saveLink.download = projectName + ".mkv";
						} else {
							saveLink.download = projectName + ".webm";
						}
					} else {
						saveLink.download = "forward-export.webm";
					}
					document.body.appendChild(saveLink);
					saveLink.click();
					document.body.removeChild(saveLink);
				}
				resolve(true);
			} catch (error) {
				reject(error);
			}
		}, { once: true });

		recorder.addEventListener("error", (event) => {
			reject(event?.error || new Error("Browser export failed."));
		}, { once: true });
	});

	return new Promise((resolve, reject) => {
		recorder.start();
		audioContext.resume().then(() => play(resolve)).catch(reject);
	}).then(async (successful) => {
		download = successful;
		recorder.stop();
		await dataReady;
		document.body.classList.remove("exporting");
		sources.forEach((source) => {
			source.disconnect(dest);
		});
		return successful;
	}).catch((error) => {
		document.body.classList.remove("exporting");
		sources.forEach((source) => {
			source.disconnect(dest);
		});
		throw error;
	});
}

window.exportVideo = exportVideo;
