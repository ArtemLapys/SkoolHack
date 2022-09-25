const startButton = document.getElementById("start");
const stopButton = document.getElementById("stop");
const undoButton = document.getElementById("undo");
const redoButton = document.getElementById("redo");
const editButton = document.getElementById("edit");
const splitButton = document.getElementById("split");
const dublicateButton = document.getElementById("dublicate");
const removeButton = document.getElementById("remove");
const addTextButton = document.getElementById("add-text");

startButton.addEventListener("click", (e) => {
	setPreviewTime(0);
});

stopButton.addEventListener("click", (e) => {
	stop(0);
	setPreviewTime(0);
});

/**
 * Я хер его знает, почемо это не работает.
 * нужно смотреть через отладчик, но у меня не получится без импорта файлов.
 * При дебаге внимание обратить на значение в activeTrack и вызов методов splitAt(), remove()
 * Если activeTrack остается в null, проблема скорее всего в tracks.js -> selected() или там где последний вызывается
 */
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
		Track.selected.layer.addBefore(newLayer)
	}
});

removeButton.addEventListener("click", (e) => {
	if (Track.selected != null) {
		Track.selected.remove("delete");
	}
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
