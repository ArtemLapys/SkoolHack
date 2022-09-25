const splitButton = document.getElementById("split");
const dublicateButton = document.getElementById("dublicate");
const removeButton = document.getElementById("remove");
const startButton = document.getElementById("start");
const stopButton = document.getElementById("stop");

splitButton.addEventListener("click", (e) => {
	if (Track.selected != null) {
		Track.selected.splitAt(previewTime - Track.selected.start);
	}
});

dublicateButton.addEventListener("click", (e) => {
	if (Track.selected != null) {
		const newTrack = Track.selected.source.createTrack();
		const newLayer = new Layer()
		newTrack.setProps(Track.selected.toJSON());
		newTrack.start = previewTime;
		newTrack.updateLength();
		newLayer.addTrack(newTrack)
		Track.selected.layer.insertBefore(newLayer)
	}
});

removeButton.addEventListener("click", (e) => {
	if (Track.selected != null) {
		Track.selected.remove("delete");
	}
});

startButton.addEventListener("click", (e) => {
	setPreviewTime(0);
});

stopButton.addEventListener("click", (e) => {
	stop(0);
	setPreviewTime(0);
});

playButton.addEventListener("click", (e) => {
	if (playing) stop();
	else play();
});

zoomOutBtn.addEventListener("click", (e) => {
	if (logScale > 0) {
		updateScale(BASE_SCALE * 2 ** --logScale);
	}
});
zoomInBtn.addEventListener("click", (e) => {
	if (logScale < MAX_SCALE) {
		updateScale(BASE_SCALE * 2 ** ++logScale);
	}
});
