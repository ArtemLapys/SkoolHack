var __blob = [];
addButtonPanel("add");
document.querySelector(".files-users").addEventListener("click", (e) => {
	if (
		e.path[0].className == "files-add files-background-add rounded" ||
		e.path[0].className == "material-symbols-outlined"
	) {
		let __addFileInput = document.getElementById("selectFile");
		__addFileInput.setAttribute("id", "selectFile");
		__addFileInput.setAttribute("type", "file");
		__addFileInput.setAttribute("style", "display: none");

		__addFileInput.onchange = function (ev) {
			if (e.path[0].innerText == "add") {
				__blob.push(__addFileInput.files[0]);
				e.path[0].innerText = __addFileInput.files[0].name;
				addButtonPanel("add");
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
		e.path[0].className == "files-add files-background-add rounded" ||
		e.path[0].className == "material-symbols-outlined"
	) {
		removeButtonPanel(e.path[0].id);
		e.preventDefault();
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
	        _elemChild[i].innerText = e.dataTransfer.files[0].name;
		    __blob.push(e.dataTransfer.files[0]);
	        addButtonPanel("add");
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

let fRemoveFileId = 0;
let fRemoveFile;
let _modalWindow = document.getElementById("modal-delete-file");
function removeButtonPanel(buttonId) {
	let _blockKeyFiles = document.getElementById("files-users-click");
	let _elemChild = _blockKeyFiles.getElementsByTagName("label");
	for (let i = 0; i < _elemChild.length; i++) {
		if (_elemChild[i].id == buttonId) {
			if (_elemChild[i].innerText != "add") {
                fRemoveFileId = _elemChild[i];
				let windowSucess = new bootstrap.Modal(_modalWindow, {
					keyboard: true,
					focus: true
				});
                
                fRemoveFile = (e => {
                    __blob.splice(fRemoveFileId.id);
                    _blockKeyFiles.removeChild(fRemoveFileId);
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

_modalWindow.addEventListener("show.bs.modal", function (e) {
    document.getElementById("modal-body-span").innerText = __blob[fRemoveFileId.id].name;
});

_modalWindow.addEventListener("hidden.bs.modal", function (e) {
    document.getElementById("delete-file").removeEventListener("click", fRemoveFile);
});