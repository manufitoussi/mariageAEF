var MariageAEF = {
	author : "Emmanuel FITOUSSI",
	dateCreation : "18/07/2012"
};

MariageAEF.Picasa = {
	mariageRequestOptions : {
		user : "manu.fitoussi",
		albumId : "5386209194677010497",
		authKey : "Gv1sRgCPKz3fW818euFg",
		imgMaxSize : "1200",
		thumbSize : "144c",
		maxResults : "500"
	},
	voyageRequestOptions : {
		user : "manu.fitoussi",
		albumId : "5388805969113150609",
		authKey : "Gv1sRgCIbF47n18urSdA",
		imgMaxSize : "1200",
		thumbSize : "144c",
		maxResults : "500"
	},

	picturesUrl : function(requestOpts) {
		return "http://picasaweb.google.com/data/feed/api/user/" + requestOpts.user + "/albumid/" + requestOpts.albumId + "?kind=photo&access=visible&alt=json&thumbsize=" + requestOpts.thumbSize + "&imgmax=" + requestOpts.imgMaxSize + "&authkey=" + requestOpts.authKey + "&max-results=" + requestOpts.maxResults + "&callback=?";
	},
	getPictures : function(requestOpts, callback) {
		$.getJSON(MariageAEF.Picasa.picturesUrl(requestOpts), function(data) {
			var pictureInfos = {
				feed : {
					title : data.feed.title.$t,
					subTitle : data.feed.subtitle.$t,
					icon : data.feed.icon.$t,
					link : data.feed.link[1].href,
					slideshow : data.feed.link[2].href
				},
				currentIndex : -1,
				imgPropertiesItems : $.map(data.feed.entry, function(imgEntry, index) {
					return {
						url : imgEntry.media$group.media$content[0].url,
						width : imgEntry.media$group.media$content[0].width,
						height : imgEntry.media$group.media$content[0].height,
						type : imgEntry.media$group.media$content[0].type,
						description : imgEntry.media$group.media$description.$t,
						title : imgEntry.media$group.media$title.$t,
						tumbnail : {
							url : imgEntry.media$group.media$thumbnail[0].url,
							width : imgEntry.media$group.media$thumbnail[0].width,
							height : imgEntry.media$group.media$thumbnail[0].height
						}
					};
				})
			};

			callback(pictureInfos);
		});
	}
};

/////////

// create app instance
MariageAEF.App = Em.Application.create();

//////// MODELS //////////

//
// Picture
//
MariageAEF.Picture = Em.Object.extend({
	name : null,
	url : null,
	description : null,
	height : 0,
	width : 0,
	title : function() {
		var description = this.get('description');
		var name = this.get('name');
		return description ? '%@: %@'.fmt(name, description) : name;
	}.property('name', 'description'),
	isSelected : false
});

//////// CONTROLLERS //////////

/*
* PicturesController
* manages picture loading and selection.
*/
MariageAEF.PicturesController = Em.Object.extend({
	title : null,
	pictures : [],
	selectedPicture : null,
	selectingPicture : null,
	loadPictures : function(callback) {

		// loads picture informations
		MariageAEF.Picasa.getPictures(MariageAEF.Picasa.voyageRequestOptions, $.proxy(function(pictureInfos) {
			//console.log('Picture infos are loaded.');

			// maps all picture infos into picture models
			this.pictures = pictureInfos.imgPropertiesItems.map(function(imgProperties) {
				return MariageAEF.Picture.create({
					description : imgProperties.description,
					name : imgProperties.title,
					height : imgProperties.height,
					width : imgProperties.width,
					url : imgProperties.url,
					tumbnail : MariageAEF.Picture.create({
						url : imgProperties.tumbnail.url,
						description : imgProperties.description,
						name : imgProperties.tumbnail.title,
						height : imgProperties.tumbnail.height,
						width : imgProperties.tumbnail.width,
					})
				});
			});

			// sets title of app.
			this.set('title', pictureInfos.feed.title);
			
			callback();
		}, this));
		
		

	},
	initSelection : function() {
		this.set('selectingPicture', this.pictures.get('firstObject'));
	},
	selectPreviousPicture : function() {
		if (this.selectedPicture) {
			var index = this.pictures.indexOf(this.selectedPicture);
			if (index > 0) {
				index--;
				this.selectPicture(this.pictures[index]);
			}
		} else {
			this.initSelection();
		}
	},
	selectNextPicture : function() {
		if (this.selectedPicture) {
			var index = this.pictures.indexOf(this.selectedPicture);
			if (index < this.pictures.length - 1) {
				index++;
				this.selectPicture(this.pictures[index]);
			}
		} else {
			this.initSelection();
		}
	},
	selectPicture : function(picture) {
		this.set('selectingPicture', picture);
	},
	selectingPictureChanged : function() {

		// changes focus in list.
		if (this.get('selectedPicture')) {
			this.setPath('selectedPicture.isSelected', false)
		}

		if (this.get('selectingPicture')) {
			this.setPath('selectingPicture.isSelected', true)
		}

		this.set('selectedPicture', this.get('selectingPicture'));

	}.observes('selectingPicture'),
});

//////// VIEWS //////////

//
// PicturesView
//
MariageAEF.App.PicturesView = Em.View.extend({

	didInsertElement : function() {

		// init selection
		this.content.initSelection();

		// register to keyup event of document.
		$(document).keyup($.proxy(this.keyup, this));
	},

	keyup : function(event) {
		if (event.keyCode == 37) {
			// previous.
			this.content.selectPreviousPicture();
		}
		if (event.keyCode == 39) {
			// next.
			this.content.selectNextPicture();
		}
	}
});

//
// PictureView
//
MariageAEF.App.PictureView = Em.View.extend({
	picture : null,
	isLoading : true,
	$image : function() {
		return $('img', $(this.findElementInParentElement()));
	}.property(),
	pictureLoaded : function() {
		this.setPath('isLoading', false);
		this.get('$image').fadeIn(300);
	},
	didInsertElement : function() {
		// img load trigger fade in.
		this.get('$image').load($.proxy(this.pictureLoaded, this));
	}
});

//
// TumbnailView
//
MariageAEF.App.TumbnailView = MariageAEF.App.PictureView.extend({
	tagName : 'li',
	click : function(event) {
		this.getPath('parentView.content').selectPicture(this.picture);
	}
});

//
// SelectedPictureView
//
MariageAEF.App.SelectedPictureView = MariageAEF.App.PictureView.extend({
	selectingPicture : null,
	resize : function() {

		$(this.findElementInParentElement()).height(parseInt($(window).height()) - 50);
		$(this.findElementInParentElement()).css('margin-left', (parseInt($(window).width()) - parseInt(this.get('$image').width())) / 2)

	},
	pictureLoaded : function() {
		this.resize();
		this._super();
	},
	didInsertElement : function(test) {
		this._super();

		// resize regeistering.
		$(window).resize($.proxy(this.resize, this));
		this.resize();
	},
	selectingPictureChanged : function() {
		// load state change
		this.setPath('isLoading', true);

		// fade out current image.
		this.get('$image').fadeOut(300, $.proxy(function() {
			// when it's done, load next picture in image.
			this.set('picture', this.get('selectingPicture'));
		}, this));
	}.observes('selectingPicture')
});

$(function() {
	// loads the templates.
	$.ajax({
		url : './templates/app.template.html',
		mimeType : 'text/html'
	}).done(function(template) {
		//console.log('Templates are loaded.');

		// creates pictures controller instance
		MariageAEF.picturesController = MariageAEF.PicturesController.create();

		MariageAEF.picturesController.loadPictures(function() {

			// setup the instance of PicturesView
			var myView = MariageAEF.App.PicturesView.create({
				template : Ember.Handlebars.compile(template),
				content : MariageAEF.picturesController
			});

			// add view to DOM
			myView.appendTo('.container');

		});

	});
});
