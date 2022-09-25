var __blob = [];
addButtonPanel("add");
document.querySelector(".files-users").addEventListener("click", (e) => {
	if (
		e.path[0].className.indexOf("files-add files-background-add rounded") != -1 ||
		e.path[0].className.indexOf("material-symbols-outlined") != -1
	) {
		let __addFileInput = document.getElementById("selectFile");
		__addFileInput.setAttribute("id", "selectFile");
		__addFileInput.setAttribute("type", "file");
		__addFileInput.setAttribute("style", "display: none");

		__addFileInput.onchange = function (ev) {
			if (e.path[0].innerText == "add") {
				//__blob.push(__addFileInput.files[0]);
				// e.path[0].innerText = __addFileInput.files[0].name;
				addButtonNormal(e.path[0], __addFileInput.files[0].name);
				addButtonPanel("add");
				__blob.push(new (toSource(__addFileInput.files[0].type))(__addFileInput.files[0]));
			} /* else {
                __blob[e.path[0].id] = __addFileInput.files[0];
                e.path[0].innerText = __addFileInput.files[0].name;
            } */
		};
		__addFileInput.click();
	}
});

document.querySelector(".files-users").addEventListener("contextmenu", (e) => {
	if (
		e.path[0].className.indexOf("video-file files-background-add rounded") != -1 ||
		e.path[0].className.indexOf("name-file") != -1
	) {
		removeButtonPanel(e.path[0].id);
		e.preventDefault();
	}
});

document.getElementById('contextMenuFile').addEventListener('hidden.bs.dropdown', function (e) {
	if (e.clickEvent.path[0].innerText.indexOf("Открыть файл") != -1) {
	    let __addFileInput = document.getElementById("selectFile");
		__addFileInput.setAttribute("id", "selectFile");
		__addFileInput.setAttribute("type", "file");
		__addFileInput.setAttribute("style", "display: none");

		__addFileInput.onchange = function (ev) {
		    let _blockKeyFiles = document.getElementById("files-users-click");
        	let _elemChild = _blockKeyFiles.getElementsByTagName("label");
            for (let i = 0; i < _elemChild.length; i++) {
        	    if (_elemChild[i].innerText == "add") {
        	        // _elemChild[i].innerText = e.dataTransfer.files[0].name;
        		    //__blob.push(e.dataTransfer.files[0]);
        		    addButtonNormal(_elemChild[i], __addFileInput.files[0].name);
        	        addButtonPanel("add");
        			__blob.push(new (toSource(__addFileInput.files[0].type))(__addFileInput.files[0]));
        	        break;
        		}
            }
		};
		__addFileInput.click();
	}
});

window.ondragenter = window.ondragover = function(e) {
    document.body.style.cursor = "no-drop";
    e.preventDefault();
};

window.ondrop = function(e) {
    document.body.style.cursor = "auto";
    e.preventDefault();
};

loadFiles.ondrop = function(e) {
    let _blockKeyFiles = document.getElementById("files-users-click");
	let _elemChild = _blockKeyFiles.getElementsByTagName("label");
    for (let i = 0; i < _elemChild.length; i++) {
	    if (_elemChild[i].innerText == "add") {
	        // _elemChild[i].innerText = e.dataTransfer.files[0].name;
		    //__blob.push(e.dataTransfer.files[0]);
		    addButtonNormal(_elemChild[i], e.dataTransfer.files[0].name);
	        addButtonPanel("add");
			__blob.push(new (toSource(e.dataTransfer.files[0].type))(e.dataTransfer.files[0]));
	        break;
		}
    }
    e.preventDefault();
};

function addButtonPanel(textButton) {
	let _blockKeyFiles = document.getElementById("files-users-click");
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
	_blockKeyFiles.appendChild(_addKeyNewFile);
}

function addButtonNormal(lastButton, textButton) {
    let _blockKeyFiles = document.getElementById("files-users-click");
    let _elemChild = _blockKeyFiles.getElementsByTagName("label");
    for (let i = 0; i < _elemChild.length; i++) {
		if (_elemChild[i].id == lastButton.id) {
		    _blockKeyFiles.removeChild(_elemChild[i]);
		    break;
		}
    }
    let _addKeyNewFile = document.createElement("div");
    _addKeyNewFile.setAttribute(
			"class",
			"video-file files-background-add rounded"
		);
    _addKeyNewFile.setAttribute(
		"style",
		"background-image: url()" //8
	);
	_addKeyNewFile.setAttribute("id", _blockKeyFiles.childElementCount);
	
	let __addKeyText = document.createElement("span");
	__addKeyText.setAttribute(
		"class",
		"name-file"
	);
	__addKeyText.setAttribute("id", _blockKeyFiles.childElementCount);
	__addKeyText.innerText = textButton;
	
	_addKeyNewFile.appendChild(__addKeyText);
	_blockKeyFiles.appendChild(_addKeyNewFile);
}

let fRemoveFile;
let _modalWindow = document.getElementById("modal-delete-file");
function removeButtonPanel(buttonId) {
	let _blockKeyFiles = document.getElementById("files-users-click");
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
                                        // layers - отсюда
                                        // layersWrapper.removeChild(layer.elem);
                                        // updateLayers();
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
                    __blob.splice(_elemChild[i].id);
                    _blockKeyFiles.removeChild(_elemChild[i]);
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