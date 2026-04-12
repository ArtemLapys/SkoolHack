// attach drop handlers to layers container so user can drop files directly onto timeline
(function(){
	// ...guard
	const layersContainer = document.getElementById('layers');
	const scrollEl = document.getElementById('scroll') || document.querySelector('.timeline-scroller');
	// If neither layers nor scroll exist — nothing to do
	if (!layersContainer && !scrollEl) return;

	function prevent(e){ e.preventDefault(); e.stopPropagation(); }

	// Attach preventDefault handlers to both layers container and scroll area (if present)
	const targets = [];
	if (layersContainer) targets.push(layersContainer);
	if (scrollEl && scrollEl !== layersContainer) targets.push(scrollEl);
	// also add document-level fallback to prevent browser opening files
	targets.push(document);

	targets.forEach(t => {
		['dragenter','dragover'].forEach(ev => t.addEventListener(ev, prevent, {passive: false}));
		t.addEventListener('dragleave', prevent, {passive: false});
	});

	// centralized drop handler (reuses existing logic below)
	async function handleDrop(e) {
		prevent(e);
		const dt = e.dataTransfer;
		if (!dt || !dt.files || dt.files.length === 0) return;
		const file = dt.files[0];

		// --- create/add preview in files panel (reuse addButtonNormal/addButtonPanel globals if present) ---
		const filesContainer = document.getElementById('files-users-click');
		let uploadId = null;
		if (filesContainer) {
			const addLabel = filesContainer.querySelector('label.files-add');
			try {
				uploadId = 'u-' + Date.now() + '-' + Math.random().toString(36).slice(2);

				// Prevent duplicate preview: if exists element with same uploadId or same filename, skip creation
				const existsById = filesContainer.querySelector(`[data-upload-id="${uploadId}"]`);
				const existsByName = Array.from(filesContainer.querySelectorAll('.video-file .name-file'))
					.some(el => el.innerText === file.name);
				if (!existsById && !existsByName) {
					if (typeof window.addButtonNormal === 'function') {
						if (addLabel) window.addButtonNormal(addLabel, file.name, uploadId);
						else {
							if (typeof window.addButtonPanel === 'function') window.addButtonPanel('add');
							const newLabel = filesContainer.querySelector('label.files-add');
							if (newLabel) window.addButtonNormal(newLabel, file.name, uploadId);
						}
					} else {
						// fallback manual insert
						const newDiv = document.createElement('div');
						newDiv.className = 'video-file files-background-add rounded';
						newDiv.setAttribute('data-upload-id', uploadId);
						const span = document.createElement('span');
						span.className = 'name-file';
						span.innerText = file.name;
						newDiv.appendChild(span);
						filesContainer.appendChild(newDiv);
					}
				} else {
					// if exists by name but no data-upload-id, try to find element and set data-upload-id
					if (!existsById && existsByName) {
						const existingNameEl = Array.from(filesContainer.querySelectorAll('.video-file'))
							.find(div => div.querySelector('.name-file')?.innerText === file.name);
						if (existingNameEl) existingNameEl.setAttribute('data-upload-id', uploadId);
					}
				}
			} catch (err) {
				console.warn('Could not create preview in files panel', err);
				uploadId = null;
			}
		}

		// --- create Source and track (Source reuses preview by uploadId) ---
		let SourceClass;
		try { SourceClass = toSource(file.type); } catch (err) { SourceClass = null; }
		if (!SourceClass) {
			console.warn('Unsupported file type for timeline drop:', file.type);
			return;
		}
		let source;
		try {
			source = new (SourceClass)(file, uploadId);
		} catch (err) {
			console.error('Failed to create Source for dropped file', err);
			return;
		}
		// keep global __blob consistent if exists
		try { if (window.__blob && Array.isArray(window.__blob)) window.__blob.push(source); } catch(e){}

		try { await source.ready; } catch(e){}

		let track;
		try { track = source.createTrack(); } catch (err) { console.error(err); return; }

		 // For image tracks ensure length is present and visual updated
		try {
			if (track.source && track.source.length && (!track.length || track.length <= 0)) {
				track.length = track.source.length;
			}
			if (typeof track.updateLength === 'function') track.updateLength();
		} catch (e) {}

		// If track uses media (video/audio), ensure media is loaded before prepare()
		try {
			// call .load() if available to start loading
			if (track.media && typeof track.media.load === 'function') {
				try { track.media.load(); } catch (e) {}
			}
			// wait for mediaLoaded promise if track exposes it (VideoTrack/AudioTrack set mediaLoaded)
			if (track.mediaLoaded && typeof track.mediaLoaded.then === 'function') {
				try { await track.mediaLoaded; } catch(e) { /* ignore */ }
			}
		} catch (e) { /* ignore */ }

		// ensure track.prepare will run after media is ready (prepare often depends on media timeupdate)
		try {
			if (typeof track.prepare === 'function') {
				const p = track.prepare(0);
				if (p && typeof p.then === 'function') await p;
			}
		} catch (e) { /* ignore prepare errors */ }

		// Ensure track has reasonable duration before inserting (images/videos)
		// Some tracks may not have duration set yet; prefer source.length, fallback to 5s
		try {
			if (!track.duration) {
				track.duration = (track.source && track.source.length) || 5;
			}
			if (typeof track.updateLength === 'function') track.updateLength();
		} catch (e) { /* ignore */ }

		 // helper: create exactly one layer at end
		function createSingleLayerAtEnd() {
			let createdLayer = null;
			try {
				// prefer existing public API addLayer / createLayer
				if (typeof addLayer === 'function') {
					createdLayer = addLayer();
				} else if (typeof window.createLayer === 'function') {
					createdLayer = window.createLayer();
				} else if (typeof window.addLayer === 'function') {
					createdLayer = window.addLayer();
				} else if (typeof Layer === 'function') {
					createdLayer = new Layer();
				}
			} catch (err) {
				createdLayer = null;
			}

			// If createdLayer is proper, make sure it's registered
			if (createdLayer && createdLayer.elem) {
				if (!createdLayer.elem.parentElement) layersContainer.appendChild(createdLayer.elem);
				if (!Array.isArray(window.layers)) window.layers = [];
				if (!window.layers.includes(createdLayer)) window.layers.push(createdLayer);
			} else {
				// try addLayer again (some implementations mutate DOM but don't return)
				if (typeof addLayer === 'function') {
					try { const maybe = addLayer(); createdLayer = maybe || createdLayer; } catch (e) {}
				}
				// final DOM fallback: create DOM layer and a minimal layerObj with required API
				if (!layersContainer.children.length) {
					const fallback = document.createElement('div');
					fallback.className = 'layer';
					fallback.innerHTML = '<div class="layer-row"></div>';
					layersContainer.appendChild(fallback);
					const layerObj = {
						elem: fallback,
						tracks: [],
						index: (window.layers && window.layers.length) ? window.layers.length : 0,
						addTrack(t) {
							this.tracks.push(t);
							try { t.layer = this; } catch (e) {}
							if (t.elem) this.elem.appendChild(t.elem);
							this.updateTracks();
						},
						removeTrack(t) {
							const i = this.tracks.indexOf(t);
							if (i >= 0) this.tracks.splice(i, 1);
							this.updateTracks();
						},
						// updateTracks used by track.js — keep simple: reflow, call per-track hooks
						updateTracks() {
							// remove nulls and ensure DOM order
							this.tracks = this.tracks.filter(Boolean);
							this.tracks.sort((a,b) => (a.start || 0) - (b.start || 0));
							// ensure DOM order reflect tracks array if track.elem exists
							for (const tr of this.tracks) {
								try {
									if (tr.elem && tr.elem.parentElement !== this.elem) this.elem.appendChild(tr.elem);
									if (typeof tr.updatePosition === 'function') tr.updatePosition();
									if (typeof tr.updateLength === 'function') tr.updateLength();
								} catch (e) {}
							}
						},
						// allow insertion of a new layer before this one (used by duplicate/split code)
						insertBefore(newLayer) {
							try {
								if (!newLayer) return;
								const newElem = newLayer.elem || newLayer;
								// DOM insertion
								if (this.elem && this.elem.parentNode) this.elem.parentNode.insertBefore(newElem, this.elem);
								// ensure global layers array exists
								if (!Array.isArray(window.layers)) window.layers = [];
								const idx = (typeof this.index === 'number' && this.index >= 0) ? this.index : window.layers.indexOf(this);
								// if newLayer is already present, remove prior occurrence
								const existingIdx = window.layers.indexOf(newLayer);
								if (existingIdx !== -1) window.layers.splice(existingIdx, 1);
								// insert into array and sync indices
								window.layers.splice(Math.max(0, idx), 0, newLayer);
								syncLayerIndices();
							} catch (e) {
								console.warn('insertBefore fallback failed', e);
							}
						}
					};
					if (!Array.isArray(window.layers)) window.layers = [];
					window.layers.push(layerObj);
					createdLayer = layerObj;
				}
			}
			// sync indices
			syncLayerIndices();
			return createdLayer;
		}

		// ensure window.layers entries have .index and dataset mapping
		function syncLayerIndices() {
			if (!Array.isArray(window.layers)) return;
			for (let i = 0; i < window.layers.length; i++) {
				const L = window.layers[i];
				if (L && typeof L === 'object') {
					L.index = i;
					if (L.elem) L.elem.dataset.layerIndex = i;
				} else {
					// try to map DOM-only layers
					const dom = layersContainer.children[i];
					if (dom) dom.dataset.layerIndex = i;
				}
			}
		}

		// If empty and drop in scroll area -> create single layer
		if (layersContainer && layersContainer.children.length === 0) {
			const scrollArea = document.getElementById('scroll') || document.querySelector('.timeline-scroller');
			const droppedInsideScroll = (() => {
				if (!scrollArea) return false;
				const rect = scrollArea.getBoundingClientRect();
				return e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
			})();
			if (droppedInsideScroll) {
				createSingleLayerAtEnd();
				if (typeof window.updateLayers === 'function') try { window.updateLayers(); } catch (err) {}
				if (typeof window.rerender === 'function') try { window.rerender(); } catch (err) {}
			}
		}

		// --- determine target layer by Y ---
		let targetLayerIndex = 0;
		const containerRect = (layersContainer || scrollEl).getBoundingClientRect();
		const relativeY = Math.max(0, e.clientY - containerRect.top);

		// Determine layer height
		let layerHeight = 60;
		if (layersContainer && layersContainer.children.length > 0) {
			const firstRect = layersContainer.children[0].getBoundingClientRect();
			layerHeight = Math.max(24, Math.round(firstRect.height));
		}

		let desiredIndex = Math.floor(relativeY / layerHeight);
		if (desiredIndex < 0) desiredIndex = 0;

		const existingCount = layersContainer ? layersContainer.children.length : 0;
		let layerElem = null;

		if (layersContainer) {
			if (desiredIndex < existingCount) {
				layerElem = layersContainer.children[desiredIndex];
				targetLayerIndex = desiredIndex;
			} else {
				// create only one layer at end and use it
				createSingleLayerAtEnd();
				targetLayerIndex = existingCount; // previous count
				layerElem = layersContainer.children[targetLayerIndex];
				if (typeof window.updateLayers === 'function') try { window.updateLayers(); } catch (err) {}
				if (typeof window.rerender === 'function') try { window.rerender(); } catch (err) {}
			}
		}

		 // --- Ensure we have a real layer object for the target index ---
		let layerObj = (Array.isArray(window.layers) && window.layers[targetLayerIndex]) ? window.layers[targetLayerIndex] : null;
		if (!layerObj && layerElem) {
			// create a minimal but fully featured layerObj so track.js methods work
			layerObj = {
				elem: layerElem,
				tracks: [],
				index: targetLayerIndex,
				addTrack(t) {
					this.tracks.push(t);
					try { t.layer = this; } catch (e) {}
					if (t.elem) this.elem.appendChild(t.elem);
					this.updateTracks();
				},
				removeTrack(t) {
					const i = this.tracks.indexOf(t);
					if (i >= 0) this.tracks.splice(i,1);
					this.updateTracks();
				},
				updateTracks() {
					this.tracks = this.tracks.filter(Boolean);
					this.tracks.sort((a,b) => (a.start||0) - (b.start||0));
					for (const tr of this.tracks) {
						try {
							if (tr.elem && tr.elem.parentElement !== this.elem) this.elem.appendChild(tr.elem);
							if (typeof tr.updatePosition === 'function') tr.updatePosition();
							if (typeof tr.updateLength === 'function') tr.updateLength();
						} catch (e) {}
					}
				},
				// implement insertBefore used by toolbar/Track logic
				insertBefore(newLayer) {
					try {
						if (!newLayer) return;
						const newElem = newLayer.elem || newLayer;
						if (this.elem && this.elem.parentNode) this.elem.parentNode.insertBefore(newElem, this.elem);
						if (!Array.isArray(window.layers)) window.layers = [];
						const idx = (typeof this.index === 'number') ? this.index : window.layers.indexOf(this);
						const existingIdx = window.layers.indexOf(newLayer);
						if (existingIdx !== -1) window.layers.splice(existingIdx, 1);
						window.layers.splice(Math.max(0, idx), 0, newLayer);
						syncLayerIndices();
					} catch (e) {
						console.warn('insertBefore fallback failed', e);
					}
				}
			};
			if (!Array.isArray(window.layers)) window.layers = [];
			window.layers[targetLayerIndex] = layerObj;
			syncLayerIndices();
		}

		// clamp
		if (Array.isArray(window.layers)) {
			targetLayerIndex = Math.max(0, Math.min(window.layers.length - 1, targetLayerIndex));
		}

		// compute start time
		function getTimeFromClientX(clientX){
			const timelineEl = document.querySelector('.timeline') || document.getElementById('scroll') || layersContainer || scrollEl;
			const rect = timelineEl.getBoundingClientRect();
			const localX = clientX - rect.left;
			if (typeof window.pxToTime === 'function') return window.pxToTime(localX);
			if (typeof window.screenToTime === 'function') return window.screenToTime(localX);
			if (typeof window.timeFromX === 'function') return window.timeFromX(localX);
			const pxPerSec = window.pxPerSecond || (window.zoom && window.zoom.pxPerSecond) || 100;
			return Math.max(0, (localX / pxPerSec));
		}
		const startTime = getTimeFromClientX(e.clientX);
		track.start = startTime;

		// add track to target
		try {
			// prefer the resolved layerObj (either existing or placeholder created above)
			if (layerObj) {
				if (typeof layerObj.addTrack === 'function') {
					layerObj.addTrack(track);
				} else {
					layerObj.tracks = layerObj.tracks || [];
					layerObj.tracks.push(track);
					if (layerObj.elem && track.elem) layerObj.elem.appendChild(track.elem);
					// ensure consistent state
					if (typeof layerObj.updateTracks === 'function') layerObj.updateTracks();
				}
				// ensure track knows its layer and is initialized
				try { track.layer = layerObj; } catch (e) {}
				if (typeof track.updateLength === 'function') track.updateLength();

				 // Подготовка трека: если текущий previewTime попадает в трек, готовим его к этому времени,
				 // иначе готовим с 0. Это гарантирует, что превью отобразится сразу.
				try {
					let rel = (typeof previewTime === 'number') ? (previewTime - (track.start || 0)) : null;
					// clamp rel
					if (typeof rel === 'number' && rel >= 0 && rel < (track.length || (track.source && track.source.length) || Infinity)) {
						if (typeof track.prepare === 'function') {
							const p = track.prepare(rel);
							if (p && typeof p.then === 'function') await p;
						}
					} else {
						if (typeof track.prepare === 'function') {
							const p = track.prepare(0);
							if (p && typeof p.then === 'function') await p;
						}
					}
				} catch (e) { /* ignore prepare errors */ }

				// убедимся, что слой обновил список треков и порядок
				try { if (typeof layerObj.updateTracks === 'function') layerObj.updateTracks(); } catch(e) {}

				// инициировать события/рендер, сделать элемент интерактивным
				if (track.elem) {
					track.elem.style.pointerEvents = 'auto';
					void track.elem.offsetWidth;
				}
				['init','initEvents','attachEvents','updatePosition','render','refresh'].forEach(fn => {
					if (typeof track[fn] === 'function') {
						try { track[fn](); } catch (e) {}
					}
				});

				// Перерисовать таймлайн / предпросмотр: если превью находится внутри трека — показать его сразу
				try {
					if (typeof previewTime === 'number') {
						// если текущий previewTime попадает в трек — пересоздать превью в этом времени
						if (previewTime >= (track.start || 0) && previewTime < (track.start || 0) + (track.length || (track.source && track.source.length) || 0)) {
							// подготовим и отрисуем в текущем времени
							try { previewTimeAt(previewTime, true); } catch(e){ if (typeof rerender === 'function') rerender(); }
						} else {
							// просто обновим UI
							if (typeof rerender === 'function') rerender();
						}
					} else {
						if (typeof rerender === 'function') rerender();
					}
				} catch(e) { if (typeof rerender === 'function') rerender(); }
			} else {
				console.warn('No layer DOM found to add dropped track. Create a layer first.');
			}
		} catch (err) {
			console.error('Failed to add dropped track to layer:', err);
		}

		// rerender/update UI
		if (typeof window.rerender === 'function') try { window.rerender(); } catch(e){}
		if (typeof window.updateLayers === 'function') try { window.updateLayers(); } catch(e){}
	}

	// Attach drop handler to both layersContainer and scrollEl (if present), and document fallback
	[...new Set([layersContainer, scrollEl, document])].forEach(target => {
		if (!target) return;
		target.addEventListener('drop', handleDrop);
	});

})();
