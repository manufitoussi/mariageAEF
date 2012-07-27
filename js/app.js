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
	isFocused : false
});

//////// CONTROLLERS //////////

/*
* PicturesController
*/
MariageAEF.PicturesController = Em.Object.extend({
	title : null,
	pictures : [],
});

//////// VIEWS //////////

//
// TumbnailsView
//
MariageAEF.App.TumbnailsView = Em.View.extend({
	selectedPicture : null,
	nextSelectedPicture : null,

	didInsertElement : function() {

		// init selection
		this.set('nextSelectedPicture', this.content.pictures.get('firstObject'));
	},
	nextSelectedPictureChanged : function() {
		// changes focus in list.
		if(this.get('selectedPicture')) {
			this.setPath('selectedPicture.isFocused', false)
		}

		if(this.get('nextSelectedPicture')) {
			this.setPath('nextSelectedPicture.isFocused', true)
		}

		this.set('selectedPicture', this.get('nextSelectedPicture'));

	}.observes('nextSelectedPicture')
});

//
// PictureView
//
MariageAEF.App.PictureView = Em.View.extend({
	//selector : 'null',
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
	click : function(evt) {
		this.setPath('parentView.nextSelectedPicture', this.get('picture'));
	}
});

//
// PictureFocusedView
//
MariageAEF.App.PictureFocusedView = MariageAEF.App.PictureView.extend({
	nextPicture : null,
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
		$(window).resize(this.resize);
		this.resize();
	},
	nextPictureChanged : function() {
		this.setPath('isLoading', true);
		this.get('$image').fadeOut(300, $.proxy(function() {
			this.set('picture', this.get('nextPicture'));
		}, this));
	}.observes('nextPicture')
});

$(function() {
	// loads the templates.
	$.ajax({
		url : './templates/app.template.html',
		mimeType : 'text/html'
	}).done(function(template) {
		//console.log('Templates are loaded.');

		// loads picture informations
		MariageAEF.Picasa.getPictures(MariageAEF.Picasa.voyageRequestOptions, function(pictureInfos) {
			//console.log('Picture infos are loaded.');

			// creates pictures controller instance
			var picturesController = MariageAEF.PicturesController.create({
				// sets title from data
				title : pictureInfos.feed.title,

				// maps all picture infos into picture models
				pictures : pictureInfos.imgPropertiesItems.map(function(imgProperties) {
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
				})
			});

			// setup the instance of TumbnailsView
			var myView = MariageAEF.App.TumbnailsView.create({
				template : Ember.Handlebars.compile(template),
				content : picturesController
			});

			// add view to DOM
			myView.appendTo('.container');
		});
	});
});
