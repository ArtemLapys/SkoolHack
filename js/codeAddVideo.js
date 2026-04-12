var __blob = [];
addButtonPanel("add");

document.addEventListener('click', (e) => {
  const target = e.target;
  if (target.closest && target.closest('.files-users')) return;
  if (target.closest && (target.closest('.files-add') || target.closest('.files-background-add'))) {
    const input = document.getElementById('selectFile') || document.getElementById('selectFile-in-menu');
    if (input) {
      input.click();
    } else {
      console.warn('File input not found (selectFile / selectFile-in-menu)');
    }
  }
});

const filesUsers = document.querySelector(".files-users");
if (filesUsers) {
  filesUsers.addEventListener("click", (e) => {
    const clicked = (e.composedPath && e.composedPath()[0]) || e.target;
    const className = clicked && clicked.className ? clicked.className : '';
    if (
      (typeof className === 'string' && (className.indexOf("files-add files-background-add") !== -1 || className.indexOf("material-symbols-outlined") !== -1)) ||
      (clicked && clicked.closest && clicked.closest('.files-add'))
    ) {
      const addButtonEl = clicked.closest('.files-add') || clicked;
      const __addFileInput = document.getElementById("selectFile") || (() => {
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.id = 'selectFile';
        inp.style.display = 'none';
        document.body.appendChild(inp);
        return inp;
      })();

      __addFileInput.onchange = function (ev) {
        if (!__addFileInput.files || __addFileInput.files.length === 0) return;
        const file = __addFileInput.files[0];
        const addText = addButtonEl.innerText || (addButtonEl.querySelector && (addButtonEl.querySelector('i')?.innerText || addButtonEl.querySelector('span')?.innerText));
        if (addText && addText.toString().trim() === "add") {
          const uploadId = generateUploadId();
          addButtonNormal(addButtonEl, file.name, uploadId);
          addButtonPanel("add");
          try {
            __blob.push(new (toSource(file.type))(file, uploadId));
          } catch (err) {
            console.error('Не удалось создать Source для файла', err);
          }
        }
        __addFileInput.value = '';
      };
      __addFileInput.click();
    }
  });

  filesUsers.addEventListener("contextmenu", (e) => {
    const clicked = (e.composedPath && e.composedPath()[0]) || e.target;
    const className = clicked && clicked.className ? clicked.className : '';
    if (typeof className === 'string' && (className.indexOf("video-file files-background-add") !== -1 || className.indexOf("name-file") !== -1 || clicked.closest('.video-file'))) {
      const targetDiv = clicked.closest('.video-file') || clicked;
      if (targetDiv) {
        removeButtonPanel(targetDiv.id);
        e.preventDefault();
      }
    }
  });
}

document.getElementById('contextMenuFile')?.addEventListener('hidden.bs.dropdown', function (e) {
  const clickEvent = e && e.clickEvent ? e.clickEvent : null;
  const clicked = clickEvent ? ((clickEvent.composedPath && clickEvent.composedPath()[0]) || clickEvent.target) : null;
  const text = clicked && clicked.innerText ? clicked.innerText : '';
  if (text.indexOf("Открыть файл") !== -1) {
    const __addFileInput = document.getElementById("selectFile") || (() => {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.id = 'selectFile';
      inp.style.display = 'none';
      document.body.appendChild(inp);
      return inp;
    })();

    __addFileInput.onchange = function (ev) {
      if (!__addFileInput.files || __addFileInput.files.length === 0) return;
      const file = __addFileInput.files[0];
      let _blockKeyFiles = document.getElementById("files-users-click");
      if (!_blockKeyFiles) return;
      let addLabel = document.querySelector('label.files-add') || _blockKeyFiles.querySelector('label.files-add');
      const uploadId = generateUploadId();
      if (!addLabel) addLabel = addButtonPanel('add');
      addButtonNormal(addLabel, file.name, uploadId);
      addButtonPanel("add");
      try {
        __blob.push(new (toSource(file.type))(file, uploadId));
      } catch (err) {
        console.error('Не удалось создать Source для файла', err);
      }
      __addFileInput.value = '';
    };
    __addFileInput.click();
  }
});

const loadFilesEl = document.getElementById('loadFiles');
if (loadFilesEl) {
  loadFilesEl.addEventListener('dragenter', e => { document.body.style.cursor = "no-drop"; e.preventDefault(); });
  loadFilesEl.addEventListener('dragover', e => { document.body.style.cursor = "no-drop"; e.preventDefault(); });
  loadFilesEl.addEventListener('drop', function(e) {
    document.body.style.cursor = "auto";
    e.preventDefault();
    if (!e.dataTransfer || !e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    const file = e.dataTransfer.files[0];
    let _blockKeyFiles = document.getElementById("files-users-click");
    if (!_blockKeyFiles) return;
    let addLabel = document.querySelector('label.files-add') || _blockKeyFiles.querySelector('label.files-add');
    const uploadId = generateUploadId();
    if (!addLabel) addLabel = addButtonPanel('add');
    addButtonNormal(addLabel, file.name, uploadId);
    addButtonPanel("add");
    try {
      __blob.push(new (toSource(file.type))(file, uploadId));
    } catch (err) {
      console.error('Не удалось создать Source для файла', err);
    }
  });
}

function addButtonPanel(textButton) {
	let _blockKeyFiles = document.getElementById("files-users-click");
	if (!_blockKeyFiles) return;

	let existingAdd = document.querySelector('.files-add');
	if (existingAdd) {
		if (existingAdd.parentElement !== _blockKeyFiles && window.innerWidth > 1280) {
			_blockKeyFiles.insertBefore(existingAdd, _blockKeyFiles.firstChild);
		}
		return existingAdd;
	}

	let _addKeyNewFile = document.createElement("label");
	_addKeyNewFile.setAttribute(
		"class",
		"files-add files-background-add rounded"
	);
	_addKeyNewFile.setAttribute("for", "file-add");
	_addKeyNewFile.setAttribute("id", _blockKeyFiles.childElementCount);

	let __addKeyText = document.createElement("i");
	__addKeyText.setAttribute("class", "material-symbols-outlined");
	__addKeyText.setAttribute("id", _blockKeyFiles.childElementCount);
	__addKeyText.innerHTML = textButton;

	_addKeyNewFile.appendChild(__addKeyText);
	_blockKeyFiles.insertBefore(_addKeyNewFile, _blockKeyFiles.firstChild);

	window.addButtonPanel = addButtonPanel;
	return _addKeyNewFile;
}

window.addButtonPanel = addButtonPanel;

function addButtonNormal(lastButton, textButton, uploadId) {
    let _blockKeyFiles = document.getElementById("files-users-click");
    if (!_blockKeyFiles) return;

    let lastEl = null;
    if (typeof lastButton === 'string') lastEl = document.getElementById(lastButton);
    else lastEl = lastButton;

    if (!lastEl || !lastEl.classList || !lastEl.classList.contains('files-add')) {
        const found = _blockKeyFiles.querySelector('label.files-add') || document.querySelector('label.files-add');
        lastEl = found || lastEl;
    }

    if (lastEl && lastEl.parentElement) {
        try { lastEl.parentElement.removeChild(lastEl); } catch (e) {}
    }

    let _addKeyNewFile = document.createElement("div");
    _addKeyNewFile.setAttribute(
			"class",
			"video-file files-background-add rounded"
		);
    _addKeyNewFile.setAttribute(
		"style",
		"background-image: url()"
	);
	_addKeyNewFile.setAttribute("id", _blockKeyFiles.childElementCount);
	if (uploadId) _addKeyNewFile.setAttribute('data-upload-id', uploadId);
	
	let __addKeyText = document.createElement("span");
	__addKeyText.setAttribute("class","name-file");
	__addKeyText.setAttribute("id", _blockKeyFiles.childElementCount);
	__addKeyText.innerText = textButton;
	
	_addKeyNewFile.appendChild(__addKeyText);
	_blockKeyFiles.appendChild(_addKeyNewFile);

	setTimeout(() => {
		if (!document.querySelector('.files-add')) {
			addButtonPanel("add");
			if (typeof window.moveAddButtonToHeader === 'function') window.moveAddButtonToHeader();
		}
	}, 0);

	window.addButtonNormal = addButtonNormal;
    return _addKeyNewFile;
}

window.addButtonNormal = addButtonNormal;

let fRemoveFile;
let _modalWindow = document.getElementById("modal-delete-file");
function removeButtonPanel(buttonId) {
	let _blockKeyFiles = document.getElementById("files-users-click");
	if (!_blockKeyFiles) return;
	let _elemChild = _blockKeyFiles.getElementsByTagName("div");
	for (let i = 0; i < _elemChild.length; i++) {
		if (_elemChild[i].id == buttonId) {
			if (_elemChild[i].innerText != "add") {
                document.getElementById("modal-body-span").innerText = __blob[_elemChild[i].id].name;
				let windowSucess = new bootstrap.Modal(_modalWindow, {
					keyboard: true,
					focus: true
				});
                
                fRemoveFile = (e => {
                    layers.forEach((layer, p) => {
                        let __isNotExit = true;
                        while (__isNotExit) {
                            let __isRemoved = false;
                            for(let __i = 0; __i < layer.tracks.length; __i++) {
                                if (layer.tracks[__i].source.url == __blob[_elemChild[i].id].url
                                && layer.tracks[__i].source.id == __blob[_elemChild[i].id].id) {
                                    layer.tracks[__i].remove('delete');
                                    __isRemoved = true;
                                    if (!layer.tracks.length) { // удалять пустые дорожки
                                        console.log(layer.tracks);
                                    }
                                    break;
                                }
                            }
                            if (!__isRemoved) {
                                __isNotExit = false;
                            }
                        }
                    });
                    __blob.splice(_elemChild[i].id, 1);
                    try { _blockKeyFiles.removeChild(_elemChild[i]); } catch(e){}
                    for (let __i = 0; __i < _elemChild.length; __i++) {
                        if (_elemChild[__i].id != __i) {
                            _elemChild[__i].id = __i;
                        }
                    }
                    windowSucess.hide();
                });
                document.getElementById("delete-file").addEventListener("click", fRemoveFile);
				windowSucess.show();
			}
			break;
		}
	}
}

_modalWindow.addEventListener("hidden.bs.modal", function (e) {
    document.getElementById("delete-file").removeEventListener("click", fRemoveFile);
});

// Helper: generate unique upload id
function generateUploadId() {
	return 'u-' + Date.now() + '-' + Math.random().toString(36).slice(2);
}

window.generateUploadId = generateUploadId;