(function () {
console.time("SStart");
	var Prefs = justoff.sstart.Prefs
	var Storage = justoff.sstart.Storage
	var Factory = justoff.sstart.Factory
	var ContextMenu = justoff.sstart.ContextMenu
	var SStart = justoff.sstart.SStart
	var Drag = justoff.sstart.Drag

	Components.utils.import("chrome://sstart/content/cache.js");
	Components.utils.import("chrome://sstart/content/utils.js");
	Components.utils.import("chrome://sstart/content/file.js");
	Components.utils.import("chrome://sstart/content/dom.js");

	var params = Utils.getQueryParams(document.location);

	if (params.folder) {
		var storage = new Storage(params.folder);
		var pageId = params.folder;
	} else {
		var storage = new Storage(false);
		var pageId = 0;
	}

	SStart.setPageId(pageId);

	document.title = storage.getTitle();
	if (document.title == "" || document.title == "SStart") {
		document.title = Utils.translate("SStart");
	}
	
	if (pageId == 0 && window.history.length == 1) {
		window.history.replaceState(null, "SStart", "chrome://sstart/content/sstart.html");
	}

	var factory = new Factory(storage);
	var hasWidgets = factory.createWidgets(pageId, true);

	var quickstart = document.getElementById("quickstart");
	if (!hasWidgets) {
		var qscontent = document.createTextNode(Utils.translate("quickstart"));
		quickstart.appendChild(qscontent);
		quickstart.style.display = "block";
	}

	var properties = storage.getProperties();
	if (properties) {
		if (properties.background) {
			document.body.style.backgroundColor = properties.background;
		}
		if (properties.headerColor) {
			document.styleSheets[1].cssRules[6].style.backgroundColor = properties.headerColor;
			document.styleSheets[1].cssRules[4].style.border = "1px solid " + properties.headerColor;
		}
		if (properties.titleColor) {
			document.styleSheets[1].cssRules[11].style.color = properties.titleColor;
		}
	}

	function updateBgImage (properties, pageId) {
		if (pageId > 0 && properties.useMainBgImage != "0" && SStart.isMainBgImage()) {
			document.body.style.backgroundImage = "url(" + File.getDataFileURL("bg_0") + ")";
			Dom.addClass(document.body, 'background-style-' + Prefs.getInt('backgroundStyle'));
		} else if (properties.backgroundImage && properties.backgroundImage == "1") {
			document.body.style.backgroundImage = "url(" + File.getDataFileURL("bg_" + pageId) + ")";
			Dom.addClass(document.body, 'background-style-' + (properties.backgroundStyle || 1));
		}
	}
	
	updateBgImage (properties, pageId);

	if (!SStart.areDecorationsVisible()) {
		Dom.addClass(document.body, 'no-decorations');
	}

	if (Prefs.getBool("bottomHeader")) {
			Dom.addClass(document.body, 'b-head');
	}

	function updateLockStatus(skipgrid) {
		var s = SStart.isLocked();
		Dom.removeClass(document.body, s ? 'unlock-edits' : 'lock-edits');
		Dom.addClass(document.body, s ? 'lock-edits' : 'unlock-edits');
		if (!skipgrid && Prefs.getBool("showGridOnUnlock")) {
			SStart.updateGridStatus(!s);
		}
	}
		
	ContextMenu.enable(document, document.getElementById("menu"));

	document.getElementById("menu-add").addEventListener("click", function (e) {
		var lockStatus = SStart.isLocked();
		if (lockStatus) {
			SStart.setLocked(false);
		}
		if (SStart.isCacheDOM() && pageId == 0) {
			var widgets = document.getElementById("widgets");
			widgets.parentNode.removeChild(widgets);
			factory.createWidgets(pageId);
		}
		if (factory.createWidget(e.target.type, cache.alignToGrid(ContextMenu.click.x), cache.alignToGrid(ContextMenu.click.y))) {
			quickstart.style.display = "none";
		} else {
			SStart.setLocked(lockStatus);
		}
		updateLockStatus();
	}, false);
	document.getElementById("menu-prefs").addEventListener("click", function (e) {
		openDialog("chrome://sstart/content/options.xul", "sstart-preferences-window", SStart.getDialogFeatures());
	}, false);
	document.getElementById("menu-lock").addEventListener("click", function (e) {
		SStart.setLocked(true);
		updateLockStatus();
	}, false);
	document.getElementById("menu-unlock").addEventListener("click", function (e) {
		SStart.setLocked(false);
		if (SStart.isCacheDOM() && pageId == 0) {
			var widgets = document.getElementById("widgets");
			widgets.parentNode.removeChild(widgets);
			factory.createWidgets(pageId);
		}
		updateLockStatus();
	}, false);
	document.getElementById("menu-alignall").addEventListener("click", function (e) {
		if (SStart.isCacheDOM() && SStart.isLocked() && pageId == 0) {
			var widgets = document.getElementById("widgets");
			widgets.parentNode.removeChild(widgets);
			SStart.setLocked(false);
			factory.createWidgets(pageId);
		}
		SStart.setLocked(false);
		SStart.alignAll();
		updateLockStatus();
	}, false);
	document.getElementById("menu-refresh").addEventListener("click", function (e) {
		if (e.target.type == "thumbnails") {
			var confirm = Utils.translate("contextRefreshAll") + " " + Utils.translate("contextThumbnails").toLowerCase();
		} else {
			var confirm = Utils.translate("contextRefreshAll") + " " + Utils.translate("contextIcons").toLowerCase();
		}
		if (Utils.confirm("\n" + confirm + "?\n\n")) {
			if (SStart.isCacheDOM() && SStart.isLocked() && pageId == 0) {
				var widgets = document.getElementById("widgets");
				widgets.parentNode.removeChild(widgets);
				SStart.setLocked(false);
				factory.createWidgets(pageId);
				SStart.setLocked(true);
			}
			if (e.target.type == "thumbnails") {
				SStart.refreshAll("refresh", "click");
			} else {
				SStart.refreshAll("icon", "refresh");
			}
		}
	}, false);
	document.getElementById("menu-refreshone").addEventListener("click", function (e) {
		if (SStart.isCacheDOM() && SStart.isLocked() && pageId == 0) {
			var widgets = document.getElementById("widgets");
			widgets.parentNode.removeChild(widgets);
			SStart.setLocked(false);
			factory.createWidgets(pageId);
			SStart.setLocked(true);
		}
		var hoverEl = ContextMenu.click.el;
		while (!hoverEl.classList.contains("widget") && hoverEl.parentElement) { hoverEl = hoverEl.parentElement }
		if (e.target.type == "thumbnail") {
			var r = Dom.child(document.getElementById(hoverEl.id), "refresh");
			if (r) {
				var event = new Event("click");
				r.dispatchEvent(event);
			}
		} else {
			var r = Dom.child(document.getElementById(hoverEl.id), "icon");
			if (r) {
				var event = new Event("refresh");
				r.dispatchEvent(event);
			}
		}
	}, false);
	document.getElementById("menu-properties").addEventListener("click", function (e) {
		if (SStart.isCacheDOM() && SStart.isLocked() && pageId == 0) {
			var widgets = document.getElementById("widgets");
			widgets.parentNode.removeChild(widgets);
			SStart.setLocked(false);
			factory.createWidgets(pageId);
			SStart.setLocked(true);
		}
		var hoverEl = ContextMenu.click.el;
		while (!hoverEl.classList.contains("widget") && hoverEl.parentElement) { hoverEl = hoverEl.parentElement }
		var r = Dom.child(document.getElementById(hoverEl.id), "properties");
		if (r) {
			var event = new Event("click");
			r.dispatchEvent(event);
		}
	}, false);
	document.getElementById("menu-remove").addEventListener("click", function (e) {
		if (SStart.isCacheDOM() && SStart.isLocked() && pageId == 0) {
			var widgets = document.getElementById("widgets");
			widgets.parentNode.removeChild(widgets);
			SStart.setLocked(false);
			factory.createWidgets(pageId);
			SStart.setLocked(true);
		}
		var hoverEl = ContextMenu.click.el;
		while (!hoverEl.classList.contains("widget") && hoverEl.parentElement) { hoverEl = hoverEl.parentElement }
		var r = Dom.child(document.getElementById(hoverEl.id), "remove");
		if (r) {
			var event = new Event("click");
			r.dispatchEvent(event);
		}
	}, false);
	document.getElementById("menu-rename").addEventListener("click", function (e) {
		if (SStart.isCacheDOM() && SStart.isLocked() && pageId == 0) {
			var widgets = document.getElementById("widgets");
			widgets.parentNode.removeChild(widgets);
			SStart.setLocked(false);
			factory.createWidgets(pageId);
			SStart.setLocked(true);
		}
		var hoverEl = ContextMenu.click.el;
		while (!hoverEl.classList.contains("widget") && hoverEl.parentElement) { hoverEl = hoverEl.parentElement }
		var r = Dom.child(document.getElementById(hoverEl.id), "title");
		if (r) {
			var event = new MouseEvent('dblclick', {
				'view': window,
				'bubbles': true,
				'cancelable': true
				});
			r.dispatchEvent(event);
		}
	}, false);
	document.getElementById("menu-props").addEventListener("click", function (e) {
		var param = { properties: properties, pageId: pageId, body: document.body, sSheet: document.styleSheets[1], doc: document };
		var xul = 'properties.xul';
		openDialog(xul, "properties", SStart.getDialogFeatures(250, 290), param);
		if (param.properties) {
			properties = param.properties;
			storage.setProperties(properties);
			if (properties.background) {
				document.body.style.backgroundColor = properties.background;
			}
			if (properties.headerColor) {
				document.styleSheets[1].cssRules[6].style.backgroundColor = properties.headerColor;
				document.styleSheets[1].cssRules[4].style.border = "1px solid " + properties.headerColor;
			}
			if (properties.titleColor) {
				document.styleSheets[1].cssRules[11].style.color = properties.titleColor;
			}
		} else {
			document.body.style.backgroundImage = "";
			Dom.removeClass(document.body, 'background-style-1');
			Dom.removeClass(document.body, 'background-style-2');
			updateBgImage (properties, pageId);
			var dir = File.getDataDirectory();
			dir.append("bg_" + pageId + "t");
			if (dir.exists()) {
				dir.remove(false);
			}
		}
	}, false);

	document.addEventListener("dblclick", function (e) {
		var hoverEl = document.elementFromPoint(e.clientX, e.clientY);
		if (e.clientX == 0 || SStart.isOverWidget(hoverEl))
			return;
		SStart.toggleLocked();
		if (SStart.isCacheDOM() && !SStart.isLocked() && pageId == 0) {
			var widgets = document.getElementById("widgets");
			widgets.parentNode.removeChild(widgets);
			factory.createWidgets(pageId);
		}
		updateLockStatus();
	}, false);

	Drag.enable(document);
	
	if (SStart.isEditOn()) {
		SStart.setLocked(false);
		SStart.setEditOff();
		updateLockStatus();
	} else {
		updateLockStatus(true);
	}

	// Disable bfcache
	window.addEventListener("beforeunload", function () {} );
console.timeEnd("SStart");
})();