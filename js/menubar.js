const editMenuButton = document.getElementById('edit-item')
const splitMenuButton = document.getElementById('split-item')
const dublicateMenuButton = document.getElementById('dublicate-item')
const removeMenuButton = document.getElementById('remove-item')

splitMenuButton.addEventListener("click", (e) => {
	if (Track.selected != null) {
		Track.selected.splitAt(previewTime - Track.selected.start);
	}
});

dublicateMenuButton.addEventListener("click", (e) => {
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

removeMenuButton.addEventListener("click", (e) => {
	if (Track.selected != null) {
		Track.selected.remove("delete");
	}
});