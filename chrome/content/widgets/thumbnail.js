function Thumbnail() {
  const RATIO = 0.75;
  const TIMEOUT_LOAD = 60 * 1000;
  const TIMEOUT_RENDER = 0.5 * 1000;
  var loading;

  this.setProperties = function(properties) {
    Thumbnail.prototype.setProperties.call(this, properties);

    if (!this.properties.width) {
      this.properties.width = Prefs.getInt("thumbnail.width");
      this.properties.height = getWidgetHeight(this.properties.width);
    }
    if (this.properties.isFolder) {
      this.properties.url = "chrome://desktop/content/desktop.html?folder=" +
                            this.properties.id;
    }
  }

  function getWidgetHeight(width) {
    return Widget.HEADER_HEIGHT + getHeight(width);
  }

  getImageName = function() {
    return this.properties.id + ".png";
  }
 
  getImageFile = function() {
    var file = File.getDataDirectory();
    file.append(getImageName.call(this));
    return file;
  }

  getImageURL = function() {
    return "chrome://desktop-profile/content/" + getImageName.call(this);
  }

  this.getIconURL = function() {
    return this.properties.isFolder ? "chrome://desktop/skin/folder.png"
                                    : Thumbnail.prototype.getIconURL.call(this);
  }

  this.createView = function() {
    return Dom.get("thumbnail").cloneNode(true);
  }

  this.updateView = function() {
    Thumbnail.prototype.updateView.call(this);

    var anchor = Dom.child(this.view, "a");
    this.properties.url ? anchor.href = this.properties.url
                        : anchor.removeAttribute("href");

    var img = Dom.child(this.view, "img");
    img.src = getImageURL.call(this);
    img.style.display = loading ? "none" : "block";

    var throbber = Dom.child(this.view, "throbber");
    throbber.style.display = loading ? "block" : "none";
  }

  this.renderView = function() {
    Thumbnail.prototype.renderView.call(this);

    this.view.style.width = this.properties.width;
    this.view.style.height = this.properties.height;

    if (this.properties.url == undefined) {
      this.openProperties();
    }

    if (!getImageFile.call(this).exists()) this.refresh();
    else this.updateView();

    var self = this;
    this.view.addEventListener("resize", function() {
      var img = Dom.child(self.view, "img");
      Drag.click.border.match(/[sn]/)
        ? self.view.style.width = getWidth(img.offsetHeight)
        : self.view.style.height = getWidgetHeight(img.offsetWidth);
    }, false);

    this.view.addEventListener("drop", function() {
      Prefs.setInt("thumbnail.width", self.properties.width);
    }, false);

    return this.view;
  }

  this.remove = function() {
    if (Thumbnail.prototype.remove.call(this)) {
      try {
        getImageFile.call(this).remove(false);
      }
      catch(e) {}
    }
  }

  this.refresh = function() {
    loading = true;
    this.updateView();

    this.properties.customImage && this.properties.title
      ? refreshCustomImage.call(this) : refreshImage.call(this);
  }

  this.openProperties = function() {
    var param = { properties: Utils.clone(this.properties) };
 
    openDialog("widgets/thumbnail/properties.xul", "properties",
               "chrome,centerscreen,modal,resizable", param);
    if (param.properties) {
      var refreshNeeded = param.properties.url != this.properties.url ||
                          param.properties.customImage != this.properties.customImage;
      this.properties = param.properties;
      this.save();

      refreshNeeded ? this.refresh() : this.updateView();
    }
  }

  function refreshImage() {
    var self = this;
    loadURI(this.properties.url || "about:blank", function(iframe) {
      if (!self.properties.title) {
        var doc = iframe.contentDocument;
        self.properties.title = doc.title;
        self.save.call(self);
      }
      if (self.properties.customImage) {
        Dom.remove(iframe);
        refreshCustomImage.call(self);
      }
      else saveImage.call(self, iframe);
    });
  }

  function refreshCustomImage() {
    var self = this;         
    loadImage(this.properties.customImage, function(iframe) {
      saveImage.call(self, iframe);
    });
  }

  function saveImage(iframe) {
    var self = this;
    setTimeout(function() {
      var image = createImage(iframe.contentWindow, self.properties.width);
      File.writeFile(getImageFile.call(self), image);
      Dom.remove(iframe);

      loading = false;

      URL.removeFromCache(getImageURL.call(self));
      self.updateView.call(self);
    },
    TIMEOUT_RENDER);
  }

  function createFrame() {
    var browserWindow = Utils.getBrowserWindow();
    var doc = browserWindow.document;

    var iframe = doc.createElement("browser");
    iframe.width = 1024;
    iframe.height = 768;
    iframe.setAttribute("type", "content");
    doc.getElementById("hidden-box").appendChild(iframe);
    return iframe;
  }

  function loadURI(url, onReady) {
    function onFrameLoad() {
      iframe.removeEventListener("load", onFrameLoad, true);
      clearTimeout(loadTimeout);
      onReady(iframe);
    }
    var iframe = createFrame();
    iframe.addEventListener("load", onFrameLoad, true);
    var loadTimeout = setTimeout(onFrameLoad, TIMEOUT_LOAD);
    iframe.setAttribute("src", url);
  }

  function loadImage(url, onReady) {
    var url = url + "#" + new Date().getTime();

    loadURI(url, function(iframe) {
      var doc = iframe.contentDocument;
      var img = doc.body.firstChild;

      if (getHeight(img.width) / img.height > 1) {
        doc.body.style.width = img.width;
        doc.body.style.height = getHeight(img.width);
      }
      else {
        doc.body.style.width = getWidth(img.height);
        doc.body.style.height = img.height;
      }
      doc.body.style.background = "white";
      doc.body.style.margin = 0;
      doc.body.style.display = "table-cell";
      doc.body.style.textAlign = "center";
      doc.body.style.verticalAlign = "middle";

      onReady(iframe);
    });
  }

  function getWidth(height) {
    return Math.floor(height / RATIO);
  }

  function getHeight(width) {
    return Math.floor(width * RATIO);
  }

  function getWindowWidth(wnd) {
    var doc = wnd.document;
    return (doc.body || doc.documentElement).offsetWidth;
  }

  function createImage(wnd, imageWidth) {
    imageWidth = imageWidth || getWindowWidth(wnd);

    var canvas = document.createElement("canvas");
    canvas.width = imageWidth;
    canvas.height = getHeight(canvas.width);

    var context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);

    var width = getWindowWidth(wnd);
    var height = getHeight(width);
    context.scale(canvas.width / width, canvas.height / height);
    context.drawWindow(wnd, 0, 0, width, height, "white");

    var dataURL = canvas.toDataURL("image/png");
    return atob(dataURL.replace(/^data:image\/png;base64,/, ""));
  }
}

Thumbnail.prototype = new Widget();