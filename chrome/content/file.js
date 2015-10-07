justoff.sstart.File = new function () {

	var File = this

	Components.utils.import("resource://gre/modules/NetUtil.jsm");
	Components.utils.import("resource://gre/modules/FileUtils.jsm");
	
	this.getDataDirectory = function () {
		var dir = Components.classes["@mozilla.org/file/directory_service;1"]
			.getService(Components.interfaces.nsIProperties)
			.get("ProfD", Components.interfaces.nsIFile);
		dir.append("sstart");
		if (!dir.exists()) {
			dir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0777);
		}
		return dir;
	};

	this.getDataFile = function (id) {
		var f = File.getDataDirectory();
		f.append(id + ".png");
		return f;
	}

	this.delDataFile = function (id) {
		var f = File.getDataDirectory();
		f.append(id + ".png");
		try {
			f.remove(false);
		} catch(e) {};
	}

	this.getDataFileURL = function (file) {
		var f = File.getDataDirectory();
		f.append(file);
		return File.getFileURL(f);
	};

	this.writeFileAsync = function (file, dataUri, callback) {
		NetUtil.asyncFetch(dataUri, function(istream, status) {
			if (!istream || !Components.isSuccessCode(status)) {
				console.log("Input stream error!")
				return;
			}
			try {
				var ostream = FileUtils.openAtomicFileOutputStream(file);
			} catch (e) {
				var ostream = FileUtils.openSafeFileOutputStream(file);
			}
			NetUtil.asyncCopy(istream, ostream, function(status) {
				if (!Components.isSuccessCode(status)) {
					console.log("File write error!");
					return;
				}
				callback();
			});
		});
	};

	this.chooseFile = function (mode, filters, name) {
		var fp = Components.classes["@mozilla.org/filepicker;1"]
			.createInstance(Components.interfaces.nsIFilePicker);
		fp.init(window, null, mode == "save" ? fp.modeSave :
			mode == "folder" ? fp.modeGetFolder : fp.modeOpen);
		for (var i in filters) {
			switch (filters[i]) {
				case "images":
					fp.appendFilters(fp.filterImages);
					break;
				case "html":
					fp.appendFilters(fp.filterHTML);
					break;
				case "text":
					fp.appendFilters(fp.filterText);
					break;
			}
		}
		fp.appendFilters(fp.filterAll);
		fp.defaultString = name;

		var result = fp.show();
		if (result == fp.returnOK ||
			result == fp.returnReplace) return fp.file;
	};

	this.getNsiFile = function (file) {
		if (file instanceof Components.interfaces.nsIFile) return file;
		else {
			var nsiFile = Components.classes["@mozilla.org/file/local;1"]
				.createInstance(Components.interfaces.nsILocalFile);
			nsiFile.initWithPath(file);
			return nsiFile;
		}
	};

	this.getFileURL = function (file) {
		var nsiFile = File.getNsiFile(file);
		var ios = Components.classes["@mozilla.org/network/io-service;1"]
			.getService(Components.interfaces.nsIIOService);
		return ios.newFileURI(nsiFile).spec;
	};

};

justoff.sstart.URL = new function () {

	var URL = this;

	this.getNsiURL = function (url) {
		var ioService = Components.classes["@mozilla.org/network/io-service;1"]
			.getService(Components.interfaces.nsIIOService);
		return ioService.newURI(url ? url : "about:blank", null, null);
	};

	this.getScheme = function (url) {
		if (url) {
			return URL.getNsiURL(url).scheme;
		}
	};

	this.readURL = function (url) {
		var ioService = Components.classes["@mozilla.org/network/io-service;1"]
			.getService(Components.interfaces.nsIIOService);
		var channel = ioService.newChannel(url, null, null);
		var stream = channel.open();

		var binary = Components.classes["@mozilla.org/binaryinputstream;1"]
			.createInstance(Components.interfaces.nsIBinaryInputStream);
		binary.setInputStream(stream);
		var data = binary.readBytes(binary.available());
		binary.close();
		stream.close();

		return data;
	};

	this.removeFromCache = function (url) {
		if (!url) return;
		try {
			var cacheService = Components.classes["@mozilla.org/image/tools;1"]
				.getService(Components.interfaces.imgITools).getImgCacheForDocument(null);
			cacheService.removeEntry(URL.getNsiURL(url));
		} catch (e) {
		}
	};

};
