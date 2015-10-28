var EXPORTED_SYMBOLS = ["Bookmark"];

Components.utils.import("chrome://sstart/content/url.js");

var Bookmark = {

	query: function (folderId) {
		var historyService = Components.classes["@mozilla.org/browser/nav-history-service;1"]
			.getService(Components.interfaces.nsINavHistoryService);

		var options = historyService.getNewQueryOptions();
		var query = historyService.getNewQuery();
		query.setFolders([folderId], 1);

		return historyService.executeQuery(query, options);
	},

	getBookmarks: function (folderId) {
		var bookmarksService = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"]
			.getService(Components.interfaces.nsINavBookmarksService);
		var result = this.query(folderId || bookmarksService.bookmarksMenuFolder);
		result.root.containerOpen = true;

		var bookmarks = [];
		for (var i = 0; i < result.root.childCount; i++) {
			var bookmark = result.root.getChild(i);
			bookmarks.push({
				id:bookmark.itemId,
				url:bookmark.uri,
				title:bookmark.title,
				isFolder:bookmark.type == bookmark.RESULT_TYPE_FOLDER
			});
		}
		result.root.containerOpen = false;
		return bookmarks;
	},

	getTitle: function (id) {
		var bookmarksService = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"]
			.getService(Components.interfaces.nsINavBookmarksService);
		return bookmarksService.getItemTitle(id);
	},

	createFolder: function (title, parentId) {
		var bookmarksService = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"]
			.getService(Components.interfaces.nsINavBookmarksService);
		return bookmarksService.createFolder(parentId || bookmarksService.bookmarksMenuFolder, title, -1);
	},

	createBookmark: function (uri, title, folderId) {
		var bookmarksService = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"]
			.getService(Components.interfaces.nsINavBookmarksService);
		return bookmarksService.insertBookmark(folderId || bookmarksService.bookmarksMenuFolder,
			URL.getNsiURL(uri), -1, title);
	},

	updateFolder: function (id, title) {
		var bookmarksService = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"]
			.getService(Components.interfaces.nsINavBookmarksService);
		bookmarksService.setItemTitle(id, title);
	},

	updateBookmark: function (id, uri, title) {
		var bookmarksService = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"]
			.getService(Components.interfaces.nsINavBookmarksService);
		bookmarksService.setItemTitle(id, title);
		bookmarksService.changeBookmarkURI(id, URL.getNsiURL(uri));
	},

	removeBookmark: function (id) {
		var bookmarksService = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"]
			.getService(Components.interfaces.nsINavBookmarksService);
		bookmarksService.removeItem(id);
	},

	getAnnotation: function (idOrUri, name) {
		var annotationService = Components.classes["@mozilla.org/browser/annotation-service;1"]
			.getService(Components.interfaces.nsIAnnotationService);
		try {
			return idOrUri instanceof Components.interfaces.nsIURI
				? annotationService.getPageAnnotation(idOrUri, name)
				: annotationService.getItemAnnotation(idOrUri, name);
		} catch (e) {
			return null;
		}
	},

	setAnnotation: function (idOrUri, name, value) {
		var annotationService = Components.classes["@mozilla.org/browser/annotation-service;1"]
			.getService(Components.interfaces.nsIAnnotationService);
		idOrUri instanceof Components.interfaces.nsIURI
			? annotationService.setPageAnnotation(idOrUri, name, value, 0, annotationService.EXPIRE_NEVER)
			: annotationService.setItemAnnotation(idOrUri, name, value, 0, annotationService.EXPIRE_NEVER);
	},

	removeAnnotation: function (idOrUri, name) {
		var annotationService = Components.classes["@mozilla.org/browser/annotation-service;1"]
			.getService(Components.interfaces.nsIAnnotationService);
		idOrUri instanceof Components.interfaces.nsIURI
			? annotationService.removePageAnnotation(idOrUri, name)
			: annotationService.removeItemAnnotation(idOrUri, name);
	}

};
