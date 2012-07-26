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

$(function() {

	$.ajax({
		url : './templates/app.template.html',
		mimeType : 'text/html'
	}).done(function(data) {

		var template = data;
		MariageAEF.App = Em.Application.create();

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

		MariageAEF.PicturesController = Em.Object.extend({
			title : null,
			pictures : [],
			focused : null,
			setFocused : function(picture) {
				var focused = this.get('focused');
				if (picture != focused) {
					if (focused != null) {
						focused.set('isFocused', false);
					}
					$('.focused-picture img').fadeOut(150, $.proxy(function() {
						this.set('focused', picture);
						picture.set('isFocused', true);
					}, this));
				}
			},
			focusedChanged : function() {
				console.log('focusedChanged : %@'.fmt(this.focused.get('title')));
			}.observes('focused')
		});

		MariageAEF.App.TumbnailsView = Em.View.extend({
			resize : function() {

				$('.focused-picture').height(parseInt($(window).height()) - 50);
				$('.focused-picture div').css('margin-left', (parseInt($(window).width()) - parseInt($('.focused-picture img').width())) / 2)

			}
		});

		MariageAEF.App.PictureView = Em.View.extend({
			picture : null,
			isLoading : true
		});

		MariageAEF.App.TumbnailView = MariageAEF.App.PictureView.extend({
			tagName : 'li',
			click : function(evt) {
				this.get('parentView').content.setFocused(this.picture);
			}
		});

		MariageAEF.Picasa.getPictures(MariageAEF.Picasa.mariageRequestOptions, function(pictureInfos) {

			var picturesController = MariageAEF.PicturesController.create({
				title : pictureInfos.feed.title
			});

			pictureInfos.imgPropertiesItems.forEach(function(imgProperties) {

				//console.log(imgProperties);

				picturesController.pictures.push(MariageAEF.Picture.create({
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
				}));
			});
			var myView = MariageAEF.App.TumbnailsView.create({
				//templateName : "tumbnails",
				template : Ember.Handlebars.compile(template),
				content : picturesController,
				didInsertElement : function() {

					$(window).resize(this.resize);

					$('.focused-picture img').load(
						$.proxy(function() {
						console.log('loaded');
						this.resize();
						$('.focused-picture img').fadeIn(150);
					}, this));

					this.resize();

					picturesController.setFocused(picturesController.pictures.get('firstObject'));
				}
			});
			myView.appendTo('.container');
		});
	});
});
