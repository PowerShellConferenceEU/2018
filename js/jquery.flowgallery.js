/*! Flow Gallery - Multimedia jQuery gallery plugin - 2.0.0
 * Copyright 2016, Nilok Bose
 * http://codecanyon.net/user/cosmocoder
*/

// polyfill for bind()
if (!Function.prototype.bind) {
    Function.prototype.bind = function(oThis) {
        if (typeof this !== "function") {
            // closest thing possible to the ECMAScript 5
            // internal IsCallable function
            throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
        }

        var aArgs = Array.prototype.slice.call(arguments, 1),
            fToBind = this,
            fNOP = function() {},
            fBound = function() {
                return fToBind.apply(this instanceof fNOP && oThis ? this : oThis,
                    aArgs.concat(Array.prototype.slice.call(arguments)));
            };

        fNOP.prototype = this.prototype;
        fBound.prototype = new fNOP();

        return fBound;
    };
}



// Object.create support test, and fallback for browsers without it
if ( typeof Object.create !== 'function' ) {
    Object.create = function(o) {
        function F() {}
        F.prototype = o;
        return new F();
    };
}



/*********** Main Gallery Code *************/
(function($, document, window) {
    'use strict';


    var FlowGallery = {
        init: function(options, elem) {
            this.options      = options;
            this.isChrome     = navigator.userAgent.match(/chrome/gi) !== null;
            this.isSafari     = navigator.userAgent.match(/webkit/gi) !== null && !this.isChrome;
            this.isOpera      = navigator.userAgent.match(/opera/gi) !== null;
            this.isiOS        = navigator.userAgent.match(/(iPad|iPhone|iPod)/gi) !== null;
            this.isAndroid    = navigator.userAgent.match(/android/i) !== null;
            this.hasTouch     = 'ontouchstart' in window;
            this.msie         = navigator.appName.toLowerCase().indexOf('microsoft') != -1;
            this.isIE9        = this.msie && parseFloat(navigator.appVersion.split('MSIE')[1], 10) == 9;
            this.isIE8        = this.msie && parseFloat(navigator.appVersion.split('MSIE')[1], 10) <= 8;
            this.ie9js        = this.msie && window.IE7 && IE7.recalc ? true : false;
            this.cssTransform = this.getSupportedTransform();
            this.svgSupported = typeof SVGRect != 'undefined';
            this.clickType    = this.hasTouch ? 'tap' : 'click';
            this.$window      = $(window);

            // always show thumbnail title for touch devices
            this.hasTouch && (this.options.alwaysShowThumbTitle = true);

            this.$galleryContainer = $(elem).addClass('flow-gallery');

            this.$menu = $('<div class="flow-menu"></div>').appendTo(this.$galleryContainer);

            this.$helperGrid = $('<div class="helper-grid '+this.options.gridType+'" />').appendTo(this.$galleryContainer);
            this.options.gridType === 'columns' && this.$helperGrid.attr('data-columns', '');

            this.$albums = $('<div class="albums"/>').appendTo(this.$galleryContainer);

            this.$mainGrid = $('<div class="main-grid"/>').appendTo(this.$galleryContainer);

            if( this.options.loadItemChunks && !this.options.loadChunksOnScroll ) {
                this.$addButton = $('<a class="btn-floating btn-large ripple-effect add-items"><i class="mdi-content-add"></i></a>').appendTo(this.$galleryContainer);
            }

            this.$mask             = $('<div class="flow-mask"/>').appendTo(this.$galleryContainer);
            this.$overlayLoader    = $('<div class="flow-overlayLoader"/>').appendTo(this.$galleryContainer);
            this.$overlay          = $('<div class="flow-overlay"/>').appendTo(this.$galleryContainer);
            this.$overlayContent   = $('<div class="overlay-content"/>').appendTo(this.$overlay);
            this.$overlayClose     = $('<a class="close"><i class="mdi-navigation-close"></i></a>').appendTo(this.$overlay);
            this.$prevItem         = $('<a class="prev-item"><i class="mdi-image-navigate-before"></i></a>').appendTo(this.$overlay);
            this.$nextItem         = $('<a class="next-item"><i class="mdi-image-navigate-next"></i></a>').appendTo(this.$overlay);
            this.$overlaySource    = $('<div class="overlay-source"/>').appendTo(this.$overlayContent);
            this.$otitle           = $('<h2 class="item-title"/>').appendTo(this.$overlayContent);

            if( this.options.enableSocialShare ) {
                this.$shareTooltip = $('<div class="share-item"/>').appendTo(this.$galleryContainer);
                var shareHtml = '';

                $.each(this.options.sharers, function(i, val) {
                    if( val === 'google' ) {
                        shareHtml += '<a class="google">Google+</a>';
                    }
                    else {
                        shareHtml += '<a class="'+val+'">'+val+'</a>';
                    }
                });

                this.$shareTooltip.html(shareHtml);
            }


            this.galleryIndex = 0;  // item index
            this.albumIndex = null;  // album index (used when albums are present)
            this.gid = $('.flow-gallery').index(this.$galleryContainer);  // gallery id for deep linking

            // add loader animation
            if( this.svgSupported ) {
                var loaderHtml = '<div class="loader"><svg class="circular"><circle class="path" cx="50" cy="50" r="20" fill="none" stroke-width="4" stroke-miterlimit="10"/></svg></div>';
                this.$galleryContainer.prepend(loaderHtml);
                this.$overlayLoader.append(loaderHtml);
            }
            else {
                this.$galleryContainer.addClass('no-svg');
            }

            this.$galleryContainer.addClass('loading');

            // build the menu
            if( this.options.showGalleryMenuBar ) {
                this.buildMenu();
            }
            else {
                this.$menu.hide();
            }

            // add style tag to head for creating grid
            this.insertStyles();

            // load the gallery data
            this.getGalleryData();

            // make jquery :contains selector case insensitive, to help with filtering
            $.expr[':'].contains = function(a, i, m) {
                return jQuery(a).text().toUpperCase().indexOf(m[3].toUpperCase()) >= 0;
            };
        },



        // insert styles for the grid
        insertStyles: function() {
            if( !this.$galleryContainer[0].id ) {
                this.$galleryContainer[0].id = 'flowGallery-' + $('.flow-gallery').index(this.$galleryContainer);
            }

            var id = this.$galleryContainer[0].id,
                $style = $('<style id="'+id+'-grid" type="text/css"/>').appendTo('head'),
                css = '#'+id+' .helper-grid .item {margin: 0 0 '+this.options.verticalGutter+'px 0;}'
                    + '#'+id+' .column .item:last-child {margin-bottom: 0;}'
                    + '#'+id+' .column {padding: 0 '+this.options.horizontalGutter/2+'px;}'
                    + '#'+id+' .card-content.caption {max-height: '+this.options.card.captionMaxHeight+'px;}';

            if( this.options.gridType === 'rows' ) {
                css += '#'+id+' .helper-grid .item {margin-right: '+this.options.horizontalGutter+'px;}';
            }

            // styles to handle columns for various screen sizes
            if( this.options.gridType === 'columns' ) {
                css += '#'+id+' .helper-grid {margin: 0 -'+this.options.horizontalGutter/2+'px;}';

                if( $.isPlainObject(this.options.columns) ) {
                    $.each(this.options.columns, function(key, val) {
                        css += '@media screen and (min-width: '+key+'px) {';
                        css +='#'+id+' .helper-grid[data-columns]::before {content: "'+val+' .column.col-1-'+val+'";}';
                        css += '}';
                        css += '#'+id+' .col-1-'+val+' {width: '+ (100/val) + '%;}';
                    });
                }
                else {  // handle only single number of columns
                    css += '#'+id+' .helper-grid[data-columns]::before {content: "'+this.options.columns+' .column.col-1-'+this.options.columns+'";}';
                    css += '#'+id+' .col-1-'+this.options.columns+' {width: '+ (100/this.options.columns) + '%;}';
                }
            }


            $style.html(css);
        },



        // create the gallery filter/sort menu
        buildMenu: function() {
            var self = this,
                names = self.options.menuComponentNames;

            var html = '<ul>';

            html += '<li class="back"><a class="ripple-effect"><i class="mdi-navigation-arrow-back"></i></a></li>';
            html += '<li class="home"><i class="mdi-image-collections left"></i><span>'+ names.albums +'</span></li>';
            html += '<li class="album-name"><span></span></li>';

            // detect support for HTML5 Fullscreen API
            if( self.options.showFullscreenButton && (document.documentElement.requestFullscreen || document.documentElement.mozRequestFullScreen || document.documentElement.webkitRequestFullscreen || document.documentElement.msRequestFullscreen) ) {
                html += '<li class="fullscreen"><a class="ripple-effect"><i class="mdi-navigation-fullscreen"></i><i class="mdi-navigation-fullscreen-exit"></i></a></li>';
            }

            if( self.options.showFilterMenu ) {
                html += '<li class="filter-menu dropdown-button"><a class="ripple-effect"><span>'+ names.filter.menu +'</span><i class="mdi-navigation-arrow-drop-down right"></i><i class="mdi-content-filter-list"></i></a>';
                html += '<ul class="dropdown">';
                html += '<li class="active filter default"><a class="ripple-effect" data-type="all">'+ names.filter.all +'</a></li>';
                //html += '<li class="active filter default"><a class="ripple-effect" data-type="Featured">Featured</a></li>';

                if( self.options.showFileTypeFilters ) {
                    html += '<li class="filter"><a class="ripple-effect" data-type="photo">'+ names.filter.photo +'</a></li>';
                    html += '<li class="filter"><a class="ripple-effect" data-type="audio">'+ names.filter.audio +'</a></li>';
                    html += '<li class="filter"><a class="ripple-effect" data-type="video">'+ names.filter.video +'</a></li>';
                }

                if( $.isArray(self.options.categoryFilters) && self.options.categoryFilters.length > 0 ) {
                    $.each(self.options.categoryFilters, function(i, val) {
                        html += '<li class="filter"><a class="ripple-effect" data-category="'+val+'">'+val+'</a></li>';
                    });
                }

                html += '</ul>';
                html += '</li>';  // end filter menu
            }


            if( self.options.sortBy.length > 0 ) {
                html += '<li class="sort-menu dropdown-button"><a class="ripple-effect"><span>'+ names.sort.menu +'</span><i class="mdi-navigation-arrow-drop-down right"></i><i class="mdi-content-sort"></i></a>';
                html += '<ul class="dropdown">';
                html += '<li class="sort active default"><a class="ripple-effect" data-sort="original">'+ names.sort.original +'</a></li>';

                $.each(self.options.sortBy, function(i, val) {
                    var sortName = val === 'title' ? names.sort.title : val === 'type' ? names.sort.type : val;
                    html += '<li class="sort"><a class="ripple-effect" data-sort="'+val+'">'+sortName+'</a></li>';
                });

                html += '</ul>';
                html += '</li>';  // end sort menu
            }

            if( self.options.showSearchFilter ) {
                html += '<li class="search"><a class="ripple-effect"><i class="mdi-action-search"></i></a><input type="text" placeholder="'+ names.search +' &hellip;" /></li>';
            }

            html += '</ul>';

            self.$galleryContainer[0].offsetWidth <= 480 && self.$menu.addClass('small');

            self.$menu.html(html);
        },



        // detect if gallery is viewed in mobile device
        detectMobile: function() {
            return $.ajax({
                url: this.options.phpFolder + '/mobile.php',
                dataType: 'text'
            });
        },



        // get gallery config json
        getConfig: function() {
            var url = '', folderUrl = '';

            if( this.options.scanPhotoFolder || this.options.scanVideoFolder) {
                if( this.options.scanPhotoFolder ) {
                    folderUrl = this.options.photoFolder;
                    url = this.options.phpFolder + '/get-photos.php';
                }
                else {
                    folderUrl = this.options.videoFolder;
                    url = this.options.phpFolder + '/get-videos.php';
                }

                if( folderUrl.indexOf('http') === -1 ) {
                    var a = document.createElement('a');
                    a.href = folderUrl;
                    folderUrl = a.href;
                }

                return $.getJSON(url, {folder: folderUrl});
            }
            else {
                return $.getJSON(this.options.configUrl);
            }
        },



        // get the cached config data
        getCache: function() {
            var req = $.ajax({
                type: 'post',
                data: {interval: this.options.cacheInterval, cacheFile: this.options.cacheFileName},
                url: this.options.cacheFolder+'/get-cache.php',
                dataType: 'json',
                global: false
            });

            return req;
        },



        // update the cache file with the fresh config data
        updateCache: function(json) {
            $.ajax({
                type: 'post',
                data: {config: JSON.stringify(json), cacheFile: this.options.cacheFileName},
                url: this.options.cacheFolder+'/update-cache.php',
                dataType: 'json',
                global: false
            });
        },



        // load the gallery data, from config json or cache
        getGalleryData: function() {
            var self = this, cacheReq, mobileReq;

            // detect mobile if option chosen
            if( self.options.detectMobile ) {
                mobileReq = self.detectMobile();
            }
            else {
                mobileReq = $.Deferred();
                mobileReq.resolve('false');
                self.isMobile = false;
            }

            // get gallery data from cache or if cache expired or disabled then load afresh
            mobileReq.done(function(mobile) {
                mobile === 'true' && (self.isMobile = true);

                if( self.options.enableCache ) {
                    cacheReq = self.getCache();
                }
                else {
                    cacheReq = $.Deferred();
                    cacheReq.resolve({expired: true});
                }

                cacheReq.done(function(cache) {
                    if( cache.expired ) {
                        if( self.options.configUrl ) {  // load json from url
                            var configReq = self.getConfig();
                            configReq.done(self.configLoaded.bind(self));
                        }
                        else {  // load gallery data from passed object
                            self.configLoaded( self.options.configData );
                        }
                    }
                    else {
                        self.config = cache;
                        self.processConfig();
                    }
                });
            });
        },



        // perform tasks after gallery config gets loaded afresh (not from cache)
        configLoaded: function(data) {
            var self = this,
                getInfo = [],
                albums = data.albums ? data.albums : [1],
                albumnum = albums.length;

            self.config = data;
            getInfo = [];

            if( data.albums ) {
                self.$menu.addClass('all-albums');
            }
            else {
                self.$menu.removeClass('all-albums');
            }

            $.each(albums, function(j) {
                var galleryData = data.albums ? data.albums[j].items : data;

                $.each(galleryData, function(i) {
                    var item = this, req;

                    if( item.type === 'youtube' && (self.options.useYoutubeThumbs || !item.title || !item.description) ) {
                        var vId = galleryData[i].source.split('v=')[1],
                            url = 'https://www.googleapis.com/youtube/v3/videos/?key=' + self.options.youtubeAPIKey + '&id=' + vId + '&part=snippet,contentDetails&callback=?',

                        req = $.getJSON(url, function(ytdata) {
                            if( self.options.useYoutubeThumbs ) {
                                galleryData[i].thumbnail = ytdata.items[0].snippet.thumbnails.medium.url;
                            }

                            if( !item.title ) {
                                galleryData[i].title = ytdata.items[0].snippet.title;
                            }

                            if( !item.description ) {
                                galleryData[i].description = ytdata.items[0].snippet.description;
                            }
                        });
                    }
                    else if( item.type === 'vimeo' && (self.options.useVimeoThumbs || !item.title || !item.description) ) {
                        var vId = galleryData[i].source.split('/').pop(),
                            url = 'https://vimeo.com/api/v2/video/'+vId+'.json?callback=?';

                        req = $.getJSON(url, function(vmdata) {
                            if( self.options.useVimeoThumbs ) {
                                galleryData[i].thumbnail = vmdata[0].thumbnail_medium;
                            }

                            if( !item.title ) {
                                galleryData[i].title = vmdata[0].title;
                            }

                            if( !item.description ) {
                                galleryData[i].description = vmdata[0].description;
                            }
                        });
                    }
                    else if( item.type === 'dailymotion' && (self.options.useDailymotionThumbs || !item.title || !item.description) ) {
                        var vId = galleryData[i].source.split('/').pop(),
                            url = 'https://api.dailymotion.com/video/'+vId+'?ssl_assets=true&fields=thumbnail_120_url,title,description&callback=?';

                        req = $.getJSON(url, function(dmdata) {
                            if( self.options.useDailymotionThumbs ) {
                                galleryData[i].thumbnail = dmdata.thumbnail_120_url;
                            }

                            if( !item.title ) {
                                galleryData[i].title = dmdata.title;
                            }

                            if( !item.description ) {
                                galleryData[i].description = dmdata.description;
                            }
                        });
                    }
                    else if( item.type === 'photo' && self.options.getExifData ) {
                        var photoUrl = item.source;

                        if( photoUrl.indexOf('http') === -1 ) {
                            var a = document.createElement('a');
                            a.href = photoUrl;
                            photoUrl = a.href;
                        }

                        req = $.ajax({
                            url: self.options.phpFolder + '/get-exif.php',
                            data: {photo: photoUrl},
                            success: function(data) {
                                !!data && (galleryData[i].description = data);
                            }
                        });
                    }

                    getInfo.push(req);
                });
            });


            $.when.apply($, getInfo).done(function() {
                self.options.enableCache && self.updateCache(self.config);
                self.processConfig();
            });
        },



        // post processing of config data after it gets loaded
        processConfig: function() {
            var self = this;

            // show the gallery on the page
            if( self.config.albums ) {
                self.setupAlbums();
            }
            else {
                self.$menu.find('li.filter').show();
                self.setupGalleryItems(self.config);
            }

            // find the appropriate scrolling container
            var $parent = self.$galleryContainer.parent();

            if( self.$galleryContainer.height() > $parent.height() ) { // scrolling inside gallery parent
                self.$scrollElem = $parent;
            }
            else {  // scrolling in window
                self.$scrollElem = self.$window;
            }

            self.options.fixMenuOnScroll && self.setupMenuLock();

            // setup events
            self.bindEvents();
        },



        // create the html for the albums page and display it on page
        setupAlbums: function() {
            var self = this,
                albums = self.config.albums,
                albumnum = albums.length,
                html = '',
                thumb,
                icon = self.options.albums.style === 'tiled' ? '<i class="mdi-image-collections"></i> &nbsp;' : '';

            for( var i = 0; i < albumnum; i++ ) {
                thumb = albums[i].thumbnail;
                !thumb && (thumb = albums[i].items[0].thumbnail);

                html += '<li>';
                html += '<figure>';
                html += '<img src="'+ thumb +'">';
                html += '<figcaption>';
                html += '<span class="title">'+ albums[i].title +'</span>';
                html += '<span class="number">'+ icon + albums[i].items.length +'</span>';
                html += '</figcaption>';
                html += '</figure>';
                html += '</li>';
            }

            self.$albums.addClass( self.options.albums.style ).html('<ul>'+html+'</ul>');

            self.$albums.imagesLoaded( self.showAlbums.bind(self) );
        },



        // show the albums
        showAlbums: function() {
            var self = this,
                $items = self.$albums.find('li'),
                stagger = self.options.albums.enterInSequence ? self.options.albums.sequenceDelay : 0,
                speed = self.options.albums.enterSpeed,
                transition = 'transition.' + self.options.albums.enterAnimation + 'In',
                easing = self.options.albums.enterAnimation.indexOf('slide') !== -1 ? 'easeOutCirc' : null;

            self.$galleryContainer.removeClass('loading');

            self.$albums.css('display', 'block');

            // check if there are hash params
            var params = self.getHashParams();

            if( params && params.hasOwnProperty('album') ) {
                speed = 0;
                stagger = 0;
                self.$albums.find('li').eq( params['album'] ).trigger(self.clickType);
            }

            // store the height of the albums page
            self.$galleryContainer.data('albumsHeight', self.$galleryContainer.height());

            $items.velocity(transition,
            {
                duration: speed,
                stagger: stagger,
                easing: easing,
                display: 'inline-block'
            });

            // trigger the onSetup event for the gallery (when there are albums)
            self.onSetup();
        },



        // get data for specific album and show it
        getAlbum: function(e) {
            var self = this,
                $li = $(e.currentTarget),
                $items = self.$albums.find('li'),
                index = $items.index( $li ),
                albumData = self.config.albums[index].items,
                transition = 'transition.' + self.options.albums.pageTransition + 'Out';

            self.albumIndex = index;
            self.$galleryContainer.css({height: self.$galleryContainer.data('albumsHeight'), overflow: 'hidden'});

            $items.eq(index).addClass('current').velocity(transition, 600, function() {
                self.$albums.css('display', 'none');
                self.$galleryContainer.addClass('loading');

                self.$menu
                    .removeClass('all-albums')
                    .addClass('album-menu')
                    .find('li.album-name').children('span').text(self.config.albums[index].title);

                self.$mainGrid.show();
                self.setupGalleryItems(albumData);
                self.$galleryContainer.css({height: '', overflow: ''});
            })
            .siblings().removeClass('current').velocity('transition.fadeOut', 600);
        },



        // return to albums page
        backToAlbums: function() {
            var self = this,
                transition = 'transition.' + self.options.albums.pageTransition + 'In',
                albumsHeight = self.$galleryContainer.data('albumsHeight'),
                containerHeight = self.$galleryContainer.height(),
                height = albumsHeight > containerHeight ? albumsHeight : containerHeight;

            self.$menu.addClass('all-albums').removeClass('album-menu').find('li.filter, li.sort').removeClass('active').filter('.default').addClass('active');
            self.options.loadItemChunks && !self.options.loadChunksOnScroll && self.$addButton.css('display', 'none');

            self.$galleryContainer.css({height: height, overflow: 'hidden'});
            self.$mainGrid.velocity('fadeOut', 600, function() {
                self.$albums.css('display', 'block')
                    .find('li.current').velocity(transition, {duration: 600, display: 'inline-block', complete: function() {
                        self.$galleryContainer.css({height: '', overflow: ''});
                    }})
                    .siblings().velocity('transition.fadeIn', {duration: 600, display: 'inline-block'});
            });
        },



        // create the gallery html (items in a single album) and set it up for display on page
        setupGalleryItems: function(data) {
            var self = this,
                list = '',
                itemnum = data.length,
                chunkSize = self.options.initialChunkSize ? self.options.initialChunkSize : self.options.chunkSize,
                category,
                categories,
                gridHtml = '',
                i = itemnum;

            // check if chunk loading is enabled
            if( self.options.loadItemChunks && itemnum > chunkSize ) {
                self.$galleryContainer.addClass('chunked');
                !self.options.loadChunksOnScroll && self.$addButton.css('display', 'inline-block');
            }

            // assign unique id's to the items (useful when items are shuffled)
            self.albumData = [];
            while(i--) {
                self.albumData[i] = data[i];
                self.albumData[i]['id'] = i;
            }


            // randomize gallery items
            if( self.options.shuffleItems ) {
                data = self.shuffle( data );
            }


            for( i = 0; i < itemnum; i++ ) {
                category = data[i]['category'] ? data[i]['category'].split(',') : [];
                categories = '{"category": false}';

                if( category.length !== 0 ) {
                    categories = '{';
                    $.each(category, function(j, cat){
                        categories += '"' + $.trim(cat) + '"' + ': true,';
                    });
                    categories = categories.substr(0, categories.length - 1);   // removing the comma from the last item
                    categories += '}';
                }

                var item = data[i],
                    type = item['type'],
                    thumb = item['thumbnail'],
                    title = item['title'];

                // create the html for the thumbnails grid
                var titleAnim = '';
                if( !self.options.alwaysShowThumbTitle ) {
                    if( self.options.thumbTitleAnimation === 'fade' ) {
                        titleAnim = ' fade';
                    }

                    if( self.options.thumbTitleAnimation === 'slide' ) {
                        titleAnim = ' slide';
                    }
                }

                var titleActivator = self.options.items.style === 'card' && self.options.card.alwaysShowCaption && !self.options.card.descriptionInCaption ? ' activator' : '';

                var thumbTitleHide = self.options.items.style === 'card' && self.options.card.alwaysShowCaption ? ' hide' : '';
                var getSize = self.options.gridType === 'rows' ? ' getSize' : '';
                var tile = self.options.items.style === 'tile' ? ' tile' : '';
                var noBlur = self.options.items.style === 'tile' && (self.isiOS || self.isAndroid) ? ' no-blur' : '';
                var hidden = self.options.loadItemChunks && i >= chunkSize ? ' hidden' : '';
                var imgsrc = self.options.loadItemChunks && i >= chunkSize ? ' data-src="'+thumb+'" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"' : ' src="'+thumb+'"';

                var sortData = '';
                if( item['sort'] ) {
                    $.each(item['sort'], function(key, val) {
                        sortData += ' data-sort-'+key+'="'+val+'"';
                    });
                }

                var itemLink = '&fgid='+self.gid;
                if( self.albumIndex !== null ) {
                    itemLink += '&album='+self.albumIndex;
                }
                itemLink += '&item='+item['id'];

                var mediaIcon = '', sourceIcon = '';
                if( item['type'] === 'photo' ) {
                    mediaIcon = 'mdi-image-photo-camera';
                    sourceIcon = 'mdi-action-pageview';
                }
                else if( item['type'] === 'video' || item['type'] === 'youtube' || item['type'] === 'vimeo' || item['type'] === 'dailymotion' ) {
                    mediaIcon = 'mdi-maps-local-movies';
                    sourceIcon = 'mdi-av-play-circle-fill';
                }
                else if( item['type'] === 'audio' ) {
                    mediaIcon = 'mdi-image-audiotrack';
                    sourceIcon = 'mdi-av-play-circle-fill';
                }

                gridHtml += '<div class="item filtered card'+tile+hidden+noBlur+'" data-id="'+item['id']+'" data-type="'+ type + '" data-categories=\''+ categories +'\' data-title="'+title.replace(/[^\w\s]/gi, '')+'"'+sortData+'>';

                gridHtml += '<div class="card-image">';
                gridHtml += '<img class="item-thumb'+getSize+'"'+imgsrc+' alt="'+ title +'" />';
                gridHtml += '<span class="card-title'+titleAnim+thumbTitleHide+'">'+title;
                gridHtml += self.options.items.style === 'tile' && self.options.showFileTypeIcons ? '<i class="'+mediaIcon+' right"></i>' : '';
                gridHtml += '</span>';

                if( self.options.items.style === 'tile' ) {
                    gridHtml += item['link'] ? '' : '<a class="show-source"><i class="'+sourceIcon+'"></i></a>';
                    gridHtml += self.options.enableSocialShare ? '<a class="share" data-link="'+itemLink+'"><i class="mdi-social-share"></i></a>' : '';
                    gridHtml += '<a class="show-info"><i class="mdi-action-info"></i></a>';
                    gridHtml += '<span class="tile-overlay"></span>';
                }

                if( item['link'] ) {
                    gridHtml += '<a class="link" href="'+item['link']+'"';
                    gridHtml += self.options.newWindowLinks ? ' target="_blank"' : '';
                    gridHtml += '><i class="mdi-content-link"></i></a>';
                }

                gridHtml += '</div>';  // end div.card-image

                if( self.options.items.style === 'card' && self.options.card.alwaysShowCaption ) {
                    gridHtml += '<div class="caption card-content">';
                    gridHtml += '<span class="card-title'+titleAnim+titleActivator+'">'+title;
                    gridHtml += !self.options.card.descriptionInCaption && item['description'] ? ' <i class="mdi-navigation-more-vert show-info"></i>' : '';
                    gridHtml += '</span>';
                    gridHtml += self.options.card.descriptionInCaption && item['description'] ? '<p>'+item['description']+'</p>' : '';
                    gridHtml += '</div>';
                }

                if( self.options.items.style === 'tile' || !self.options.card.alwaysShowCaption || !self.options.card.descriptionInCaption ) {
                    gridHtml += '<div class="card-reveal caption">';
                    gridHtml += '<span class="card-title">'+title+' <i class="mdi-navigation-close close"></i></span>';
                    gridHtml += item['description'] ? '<p>'+item['description']+'</p>' : '';
                    gridHtml += '</div>';
                }

                // CUSTOMIZE!
                if( self.options.items.style === 'card' ) {
                    gridHtml += '<div class="card-action">';
                    gridHtml += '<a class="show-source"><i class="'+sourceIcon+'"></i></a>';
                    gridHtml += self.options.enableSocialShare ? '<a class="share" data-link="'+itemLink+'"><i class="mdi-social-share"></i></a>' : '';
                    gridHtml += !self.options.card.alwaysShowCaption && item['description'] ? '<a class="show-info"><i class="mdi-navigation-more-vert"></i></a>' : '';
                    gridHtml += self.options.showFileTypeIcons ? '<i class="'+mediaIcon+' right"></i>' : '';
                    gridHtml += '</div>';
                }

                gridHtml += '</div>';
            }

            self.$mainGrid
                .html(gridHtml)
                .imagesLoaded(function() {
                    if( self.options.gridType === 'rows' ) {
                        self.$mainGrid.find('img.item-thumb').each(function() {
                            this.setAttribute('data-width', this.width);
                            this.setAttribute('data-height', this.height);
                        })
                        .removeClass('getSize');
                    }

                    // trigger the onAlbumLoad event
                    if( self.config.albums ) {
                        self.onAlbumLoad();
                    }
                    else {
                        self.onSetup();  // trigger the onSetup event (when there are no albums)
                    }

                    self.showGallery();
                });
        },



        showGallery: function() {
            var self = this,
                $items = self.$mainGrid.children('div.item:not(.hidden)'),
                speed = self.options.items.enterSpeed,
                stagger = self.options.items.enterInSequence ? self.options.items.sequenceDelay : 0,
                transition = 'transition.' + self.options.items.enterAnimation + 'In';

            self.layoutItems($items, null, true);
            self.$galleryContainer.removeClass('loading');
            self.$mainGrid.css('opacity', 1);

            // hide empty categories
            self.options.hideEmptyCategories && self.hideEmptyCategories();

            // check if there are params in the hash
            var params = self.getHashParams();
            if( params ) {
                speed = 0;
                stagger = 0;
                self.$mainGrid.children('div.item').filter('[data-id="'+params['item']+'"]').find('a.show-source').trigger(self.clickType);
            }

            $items.velocity(transition,
            {
                duration: speed,
                stagger: stagger,
                complete: function() {
                    self.options.loadItemChunks && self.options.loadChunksOnScroll && self.$galleryContainer.hasClass('chunked') && self.setupAutoChunkLoading();
                }
            });
        },


        // hide category options in the menu for which there are no corresponding items
        hideEmptyCategories: function() {
            var self = this,
                $items = self.$mainGrid.children('div.item.filtered'),
                categories = self.options.categoryFilters,
                types = ['photo', 'audio', 'video'];

            $items.each(function(i) {

                // detect presence of items of custom categories
                for( var j = 0, cLen = categories.length; j < cLen; j++ ){
                    if( categories[j] in $items.eq(i).data('categories') ) {
                        categories.splice(j, 1);
                        j--;
                    }
                }

                // detect items of various file types
                var itemType = $items.eq(i).data('type');
                if( itemType === 'youtube' || itemType === 'vimeo' || itemType === 'dailymotion' ) {
                    itemType = 'video';
                }

                for( var k = 0, tLen = types.length; k < tLen; k++ ){
                    if( itemType === types[k] ) {
                        types.splice(k, 1);
                        k--;
                    }
                }

                if( categories.length === 0 && types.length === 0 ) {
                    return false;
                }
            });

            self.$menu.find('li.filter').show();

            $.each(categories, function(j, category) {
                self.$menu.find('li.filter-menu a[data-category="'+category+'"]').parent().hide();
            });

            $.each(types, function(j, type) {
                self.$menu.find('li.filter-menu a[data-type="'+type+'"]').parent().hide();
            });
        },



        // setup chunk loading on scroll
        setupAutoChunkLoading: function(isFullscreen) {
            var self = this,
                scrollTimer, scrollElem;

            if(isFullscreen) {
                scrollElem = self.$galleryContainer;
            }
            else {
                scrollElem = self.$scrollElem;
            }

            scrollElem.off('scroll.chunk').on('scroll.chunk', function() {
                if( scrollTimer ) {
                    clearTimeout(scrollTimer);
                }

                scrollTimer = setTimeout(function() {
                    if( self.$scrollElem.scrollTop() + self.$scrollElem.height() >= self.$galleryContainer.offset().top + self.$galleryContainer.height() ) {
                        self.appendItems();
                    }
                }, 250);
            }).trigger('scroll.chunk');
        },



        // add items to the grid (when using chunked loading)
        appendItems: function() {
            var self = this,
                $newItems = self.$mainGrid.children('div.item.hidden').slice(0, self.options.chunkSize),
                $images = $newItems.find('img.item-thumb'),
                stagger = self.options.items.enterInSequence ? self.options.items.sequenceDelay : 0,
                transition = 'transition.' + self.options.items.enterAnimation + 'In';

            self.$galleryContainer.addClass('appending');
            !self.options.loadChunksOnScroll && self.$addButton.css('display', '');

            $images.each(function() {
                this.src = '';  // hack to get firefox to recognize new src and fire imagesLoaded
                this.src = this.getAttribute('data-src');
            });

            $newItems.imagesLoaded(function() {
                $newItems.removeClass('hidden');

                if( self.options.gridType === 'rows' ) {
                    $images.addClass('getSize').each(function() {
                        this.setAttribute('data-width', this.width);
                        this.setAttribute('data-height', this.height);
                    })
                    .removeClass('getSize');
                }

                self.$menu.find('li.filter.active:not(.default)').trigger(self.clickType);  // reapply current filter
                self.$menu.find('li.sort.active:not(.default)').trigger(self.clickType);  // reapply current sort

                self.layoutItems(self.$mainGrid.children('div.filtered:not(.hidden)'), null, true);
                self.$galleryContainer.removeClass('appending');
                !self.options.loadChunksOnScroll && self.$addButton.css('display', 'inline-block');

                $newItems.filter('.filtered').velocity(transition,
                {
                    duration: self.options.items.enterSpeed,
                    stagger: stagger
                });

                // check if any more items left to load
                if( self.$mainGrid.children('div.item.hidden').length === 0 ) {
                    self.$galleryContainer.removeClass('chunked');
                    !self.options.loadChunksOnScroll && self.$addButton.css('display', '');

                    // unbind chunk loading events
                    if( self.options.loadChunksOnScroll ) {
                        self.$scrollElem.off('scroll.chunk');
                    }
                    else {
                        !self.config.albums && !self.options.loadChunksOnScroll && self.$addButton.off(self.clickType); // unbind click event if there are no albums
                    }
                }
            });
        },



        // function to layout items in columns/rows
        layoutItems: function($showItems, $hideItems, isEntering) {
            $showItems = $showItems.not('.hidden');

            var self = this,
                $clones,
                itemnum = $showItems.length,
                i = itemnum,
                itemsHtml = [],
                bounds = [],
                imgSizes = [],
                helperWidth,
                helperHeight,
                wHeight,
                wTop,
                gTop;

            self.options.gridType === 'rows' && $showItems.removeClass('last-row');

            while(i--) {
                itemsHtml[i] = $showItems[i].outerHTML;
            }

            self.$helperGrid[0].style.cssText = 'display: block;';
            self.$helperGrid[0].innerHTML = itemsHtml.join('');
            $clones = self.$helperGrid.children().each(function() {
                this.removeAttribute('style');
            });

            self.options.gridType === 'columns' ? salvattore['register_grid'](self.$helperGrid[0]) : self.createRows();

            i = itemnum;

            while(i--) {
                var left = $clones[i].offsetLeft;

                if( self.options.gridType === 'rows' ) {
                    var $ci = $clones.eq(i).find('img.item-thumb');
                    imgSizes[i] = {width: $ci[0].width, height: $ci[0].height};
                }

                self.options.gridType === 'columns' && (left -= self.options.horizontalGutter/2 );
                bounds[i] = {top: $clones[i].offsetTop, left: left, width: $clones[i].offsetWidth, height: $clones[i].offsetHeight};

                $.data($showItems[i], 'props', {left: $showItems[i].offsetLeft, top: $showItems[i].offsetTop, height: bounds[i].height});
            }

            if( $hideItems ) {
                i = $hideItems.length;

                while(i--) {
                    $.data($hideItems[i], 'props', {left: $hideItems[i].offsetLeft, top: $hideItems[i].offsetTop, height: $hideItems[i].offsetHeight});
                }
            }

            helperWidth = self.$helperGrid[0].offsetWidth - self.options.horizontalGutter;
            helperHeight = self.$helperGrid[0].offsetHeight;
            wTop = self.$window.scrollTop();
            wHeight = self.$window.height();
            gTop = self.$mainGrid.offset().top;

            i = itemnum;

            while(i--) {
                var pos = {top: bounds[i].top, left: bounds[i].left},
                    width = bounds[i].width,
                    height = bounds[i].height,
                    item = $showItems[i];

                if( isEntering ) {  // if the items are being shown on gallery load
                    item.style.cssText += 'width: '+width+'px; height: '+height+'px; left: '+pos.left+'px; top: '+pos.top+'px;';
                }
                else {
                    item.style.cssText += 'width: '+width+'px; height: '+height+'px;';
                }

                if( self.options.gridType === 'rows' ) {
                    var $img = $showItems.eq(i).find('img.item-thumb');
                        // $ci = $clones.eq(i).find('img.item-thumb');

                    $img[0].style.cssText += 'width: '+imgSizes[i].width+'px; height: '+imgSizes[i].height+'px;';
                    self.options.card.alwaysShowCaption && $showItems.eq(i).find('div.card-content').css('height', $clones.eq(i).find('div.card-content').css('height'));
                    $clones.eq(i).hasClass('last-row') && $showItems.eq(i).addClass('last-row');
                }

                $.data(item, 'position', pos);
            }

            self.$mainGrid[0].style.cssText += 'height: '+ helperHeight + 'px; width: '+ helperWidth + 'px;';
            self.$helperGrid[0].style.cssText = 'display: none;';
            self.$helperGrid[0].innerHTML = '';

            // animated hide and show of items after filtering
            if( !isEntering ) {
                $showItems.add($hideItems).velocity('finish');
                !!$hideItems && self.hideUnfilteredItem($hideItems, wHeight, wTop, gTop);  // no need to proceed if no items to hide
                self.showFilteredItems($showItems, wHeight, wTop, gTop);
            }
        },



        // layout images in rows, with all images in a row having the same height
        createRows: function() {
            var self = this,
                rowWidth = 0,
                rowHeight = 0,
                gridWidth = self.$helperGrid[0].clientWidth + self.options.horizontalGutter,
                $images = self.$helperGrid.find('img.item-thumb'),
                imagenum = $images.length,
                rowImages = [],
                ratios = 0,
                sizes = [],
                totalWidth = 0,
                breakRow = false,
                i = 0,
                j = 0;

            // increase width to allow for horizontal gutter of last items in a row
            self.$helperGrid.css('width', gridWidth);

            while(i < imagenum) {
                sizes.push({width: parseInt($images[i].getAttribute('data-width'), 10), height: parseInt($images[i].getAttribute('data-height'), 10)});
                rowWidth = gridWidth - (i+1) * self.options.horizontalGutter;
                totalWidth += sizes[i].width + self.options.horizontalGutter;
                ratios += sizes[i].width/sizes[i].height;
                rowHeight = rowWidth/ratios;
                j = i;

                if( totalWidth * 1.1 > gridWidth ) {
                    breakRow = true;
                }
                else {
                    while( j-- ) {
                        if( rowHeight*sizes[j].width/sizes[j].height < self.options.rowItemMinWidth ) {
                            breakRow = true;
                            break;
                        }
                    }
                }

                if( breakRow ) {
                    rowImages = $images.slice(0, i);
                    self.setItemHeights(rowImages, gridWidth, sizes, false);
                    $images = $images.slice(i);
                    imagenum = $images.length;
                    rowImages.length = 0;
                    sizes.length = 0;
                    rowWidth = 0;
                    totalWidth = 0;
                    ratios = 0;
                    i = 0;
                    breakRow = false;
                    continue;
                }

                i++;
            }

            self.setItemHeights($images, gridWidth, sizes, true); // handle remaining images of the last row
            $images.closest('div.item').addClass('last-row'); // add class to the last row items
            self.options.card.alwaysShowCaption && self.setEqualCaptionHeights();  // make the item captions in a row have equal height
        },



        // set height of images in a row (for gridType rows)
        setItemHeights: function($images, gridWidth, nativeSizes, lastRow) {
            var self = this,
                rowHeight,
                rowWidth = 0,
                totalWidth = 0,
                imagenum = $images.length,
                ratios = 0,
                heights = [],
                justifyLastRow = false,
                w = 0,
                i = 0;

            // substract the horizontal gutters to get actual available width
            rowWidth = gridWidth - imagenum * self.options.horizontalGutter;

            for( i = 0; i < imagenum; i++ ) {
                totalWidth += nativeSizes[i].width;
                ratios += nativeSizes[i].width/nativeSizes[i].height;
                heights.push(nativeSizes[i].height);
            }

            // first calculate the height for the row
            rowHeight = ((rowWidth/ratios) | 0);

            if( lastRow ) {
                // always justify last row if its totalWidth is greater than 75% of available width
                justifyLastRow = totalWidth > 0.75 * rowWidth ? true : self.options.justifyLastRow;

                if( !justifyLastRow ) {
                    var maxImgHeight = Math.max.apply(Math, heights);
                    rowHeight > maxImgHeight && (rowHeight = maxImgHeight);
                }
            }

            // then store the new dimensions for the images
            totalWidth = 0;

            for( i = 0; i < imagenum; i++ ) {
                w = ((rowHeight*nativeSizes[i].width/nativeSizes[i].height) | 0);
                totalWidth += w;

                if( (i === imagenum - 1 && totalWidth < rowWidth) && (!lastRow || (lastRow && justifyLastRow)) ) {
                    w += rowWidth - totalWidth;
                }

                $images.eq(i).css({width: w, height: rowHeight}).closest('div.item').css('width', w);
            }
        },



        // set equal height for all captions in a row (only when captions are always visible)
        setEqualCaptionHeights: function () {
            var self = this,
                currentTallest = 0,
                currentRowStart = 0,
                rowDivs = [],
                $el,
                topPosition = 0;

            self.$helperGrid.find('div.card-content').each(function() {
                $el = $(this).css('height', 'auto');
                topPosition = $el[0].offsetTop;

                if( currentRowStart !== topPosition ) {
                    for( var currentDiv = 0; currentDiv < rowDivs.length ; currentDiv++ ) {
                        rowDivs[currentDiv][0].style.height = currentTallest+'px';
                    }
                    rowDivs.length = 0; // empty the array
                    currentRowStart = topPosition;
                    currentTallest = $el[0].offsetHeight;
                    rowDivs.push($el);
                }
                else {
                    rowDivs.push($el);
                    currentTallest = currentTallest < $el[0].offsetHeight ? $el[0].offsetHeight : currentTallest;
                }

                for( var currentDiv = 0; currentDiv < rowDivs.length; currentDiv++ ) {
                    rowDivs[currentDiv][0].style.height = currentTallest+'px';
                }
            });
        },



        // hide items that have not been filtered
        hideUnfilteredItem: function($hideItems, wHeight, wTop, gTop) {
            var self = this,
                i = $hideItems.length,
                props,
                elemTop,
                elemLeft,
                height;

            while(i--) {
                props = $.data($hideItems[i], 'props');
                elemTop = props.top;
                elemLeft = props.left;
                height = props.height;

                // store the current position, to be used for animating into visibility later
                $.data($hideItems[i], 'hidePos', {left: elemLeft, top: elemTop});

                // only animate items inside viewport
                if( (elemTop + height + gTop < wTop) || (elemTop + gTop > wTop + wHeight) ) {
                    $hideItems[i].style.cssText += 'display: none';
                }
                else {
                    $hideItems.eq(i)
                    .addClass('animating')
                    .velocity('transition.expandOut',
                    {
                        duration: this.options.layoutSpeed,
                        display: 'none',
                        mobileHA: true,
                        complete: function() {
                            $(this).removeClass('animating');
                        }
                    });
                }
            }
        },



        // show the items that have been filtered
        showFilteredItems: function($showItems, wHeight, wTop, gTop) {
            var self = this,
                itemnum = $showItems.length,
                showSequence = [],
                i = itemnum;

            while(i--) {
                var item = $showItems[i],
                    pos = $.data(item, 'position'),
                    props = $.data(item, 'props'),
                    height = props.height,
                    animObj = {};

                if( item.style.display !== 'none' ) {
                    animObj = {
                        translateZ: [0,0],
                        left: [pos.left, props.left],
                        top: [pos.top, props.top]
                    };
                }
                else {
                    var hidePos = $.data(item, 'hidePos');

                    animObj = {
                        scaleX: [1,0],
                        scaleY: [1,0],
                        opacity: [1,0],
                        translateZ: [0,0],
                        left: [pos.left, hidePos.left],
                        top: [pos.top, hidePos.top]
                    };
                }

                // only animate items inside viewport
                if( ((animObj.top[1] + height + gTop < wTop) || (animObj.top[1] + gTop > wTop + wHeight)) && ((animObj.top[0] + height + gTop < wTop) || (animObj.top[0] + gTop > wTop + wHeight)) ) {
                    item.style.cssText += 'left: ' + pos.left + 'px; top: '+ pos.top + 'px; display: block; opacity: 1; -webkit-transform: scale(1); -ms-transform: scale(1); transform: scale(1);';
                }
                else {
                    $showItems.eq(i)
                    .addClass('animating')
                    .velocity(animObj,
                    {
                        duration: self.options.layoutSpeed,
                        display: 'block',
                        easing: 'ease-out',
                        queue: false,
                        mobileHA: true,
                        complete: function() {
                            $(this).removeClass('animating');
                        }
                    });
                }
            }
        },



        // recreate the grid after each window resize
        recreateGrid: function() {
            var self = this;

            var func = self.debounce(function() {
                self.$menu.find('li.sort.active:not(.default)').trigger(self.clickType);  // reapply current sort
                self.layoutItems(self.$mainGrid.children('div.filtered:not(.hidden)'), null, false);
            }, 250);

            func();
        },



        // shuffle the gallery items
        shuffle: function(items) {
            for(var j, x, i = items.length; i; j = parseInt(Math.random() * i, 10), x = items[--i], items[i] = items[j], items[j] = x);

            return items;
        },



        // show the item captions/info
        showItemInfo: function(e) {
            var $btn = $(e.target),
                $item = $btn.closest('div.item'),
                $caption = $item.find('div.card-reveal'),
                speed = this.options.captionAnimationSpeed,
                animation = this.options.captionShowAnimation;

            $item.addClass('info-shown');

            switch(animation) {
                case 'fade':
                    $caption.css('top', 0).velocity({opacity: [1, 0]}, speed, 'easeOutQuad');
                    break;

                case 'slideUp':
                    $caption.velocity({top: [0, '100%']}, speed, 'easeOutQuad');
                    break;

                case 'slideDown':
                    $caption.css({top: 'auto', bottom: '100%'}).velocity({bottom: [0, '100%']}, speed, 'easeOutQuad');
                    break;

                case 'pushUp':
                    $caption.velocity({top: [0, '100%']}, speed, 'easeOutQuad');
                    $item.find('div.card-image').velocity({marginTop: ['-100%', 0]}, speed, 'easeOutQuad');
                    break;

                case 'pushDown':
                    $caption.css({top: 'auto', bottom: '100%'}).velocity({bottom: [0, '100%']}, speed, 'easeOutQuad');
                    $item.find('div.card-image').velocity({marginTop: ['100%', 0]}, speed, 'easeOutQuad');
                    break;

                case 'expand':
                    $caption.css({top: 0, overflow: 'hidden'}).velocity('transition.expandIn', speed, function() {
                        $caption.css('overflow', '');
                    });
                    break;

                case 'shrink':
                    $caption.css({top: 0, overflow: 'hidden'}).velocity('transition.shrinkIn', speed, function() {
                        $caption.css('overflow', '');
                    });
                    break;

                case 'flipY':
                    $caption.css({top: 0, overflow: 'hidden'}).velocity('transition.flipYIn', speed, function() {
                        $caption.css('overflow', '');
                    });
                    break;

                case 'flipX':
                    $caption.css({top: 0, overflow: 'hidden'}).velocity('transition.flipXIn', speed, function() {
                        $caption.css('overflow', '');
                    });
                    break;
            }
        },



        // hide the item captions/info
        hideItemInfo: function(e) {
            var $btn = $(e.target),
                $item = $btn.closest('div.item'),
                $caption = $item.find('div.card-reveal'),
                speed = this.options.captionAnimationSpeed,
                animation = this.options.captionShowAnimation;

            $item.removeClass('info-shown');

            switch(animation) {
                case 'fade':
                    $caption.velocity({opacity: [0, 1]}, speed, 'easeOutQuad', function() {
                        $caption.css('top', '100%');
                    });
                    break;

                case 'slideUp':
                    $caption.velocity({top: ['100%', 0]}, speed, 'easeOutQuad');
                    break;

                case 'slideDown':
                    $caption.velocity({bottom: ['100%', 0]}, speed, 'easeOutQuad', function() {
                        $caption.css({top: '100%', bottom: 'auto'});
                    });
                    break;

                case 'pushUp':
                    $caption.velocity({top: ['100%', 0]}, speed, 'easeOutQuad');
                    $item.find('div.card-image').velocity({marginTop: [0, '-100%']}, speed, 'easeOutQuad');
                    break;

                case 'pushDown':
                    $caption.velocity({bottom: ['100%', 0]}, speed, 'easeOutQuad', function() {
                        $caption.css({top: '100%', bottom: 'auto'});
                    });
                    $item.find('div.card-image').velocity({marginTop: [0, '100%']}, speed, 'easeOutQuad');
                    break;

                case 'expand':
                    $caption.css('overflow', 'hidden').velocity('transition.expandOut', speed, function() {
                        $caption.css({top: '100%', opacity: 1, overflow: ''});
                    });
                    break;

                case 'shrink':
                    $caption.css('overflow', 'hidden').velocity('transition.shrinkOut', speed, function() {
                        $caption.css({top: '100%', opacity: 1, overflow: ''});
                    });
                    break;

                case 'flipY':
                    $caption.css('overflow', 'hidden').velocity('transition.flipYOut', speed, function() {
                        $caption.css({top: '100%', opacity: 1, overflow: ''});
                    });
                    break;

                case 'flipX':
                    $caption.css('overflow', 'hidden').velocity('transition.flipXOut', speed, function() {
                        $caption.css({top: '100%', opacity: 1, overflow: ''});
                    });
                    break;
            }
        },



        // filter gallery items
        filterItems: function(e) {
            var self     = this,
                $li      = $(e.currentTarget),
                $btn     = $li.children('a'),
                type     = $btn[0].getAttribute('data-type'),
                category = $btn[0].getAttribute('data-category'),
                $items   = self.$mainGrid.children('div.item'),
                $filteredItems;

            // don't filter again if the user clicked the same filter button, but proceed when triggered through script
            if( $li.hasClass('active') && ((self.hasTouch && e.x) || e.originalEvent) ) {
                return;
            }

            $li.addClass('active').siblings('li.filter').removeClass('active');

            // sort by file type, i.e photo, audio or video
            if( type ) {
                if( type === 'all' ) {
                    $filteredItems = $items;
                }
                else {
                    if( type === 'video' ) {
                        $filteredItems = $items.filter('[data-type="video"], [data-type="youtube"], [data-type="vimeo"], [data-type="dailymotion"]');
                    }
                    else {
                        $filteredItems = $items.filter('[data-type='+ type +']');
                    }
                }
            }
            // sort by custom categories
            else if( category ) {
                $filteredItems = $items.filter(function(){
                    return category in $(this).data('categories');
                });
            }

            var $unfilteredItems = $items.not($filteredItems);
            $unfilteredItems.removeClass('filtered');
            $filteredItems.addClass('filtered');

            // layout items only if user manually initiated filter
            if( (self.hasTouch && e.x) || e.originalEvent ) {
                self.layoutItems($filteredItems, $unfilteredItems, false);
            }
        },



        // sort gallery items
        sortItems: function(e) {
            var self     = this,
                $li      = $(e.currentTarget),
                $btn     = $li.children('a'),
                sortBy   = $btn[0].getAttribute('data-sort'),
                $items   = self.$mainGrid.children('div.item');

            // don't sort again if the user clicked the same sort button, but proceed when triggered through script
            if( $li.hasClass('active') && ((self.hasTouch && e.x) || e.originalEvent) ) {
                return;
            }

            $li.addClass('active').siblings('li.sort').removeClass('active');

            $items.sort(function(item1, item2) {
                var sort1, sort2;

                if( sortBy === 'title' ) {
                    sort1 = item1.getAttribute('data-title');
                    sort2 = item2.getAttribute('data-title');
                }
                else if( sortBy === 'type' ) {
                    sort1 = item1.getAttribute('data-type');
                    sort2 = item2.getAttribute('data-type');
                }
                else if( sortBy === 'original' ) {
                    sort1 = parseInt(item1.getAttribute('data-id'), 10);
                    sort2 = parseInt(item2.getAttribute('data-id'), 10);
                }
                else {
                    sort1 = item1.getAttribute('data-sort-'+sortBy);
                    sort2 = item2.getAttribute('data-sort-'+sortBy);
                    if( !isNaN(parseFloat(sort1, 10)) ) {
                        sort1 = parseFloat(sort1, 10);
                        sort2 = parseFloat(sort2, 10);
                    }
                }

                if( sort1 > sort2 ) {
                    return 1;
                }

                if( sort1 < sort2 ) {
                    return -1;
                }

                return 0;
            });

            self.options.sortOrder === 'descending' && ($items = $($items.get().reverse()));

            var $showItems = $items.filter('div.filtered'),
                $hideItems = $items.not($showItems);

            // layout items only if user manually initiated sort
            if( (self.hasTouch && e.x) || e.originalEvent ) {
                self.layoutItems($showItems, $hideItems, false);
            }
            else {
                $items.detach().appendTo(self.$mainGrid);
            }
        },



        // function to create overlay content for gallery
        overlayCreate: function (e) {
            var self          = this,
                $item         = $(e.target).closest('div.item'),
                $items        = self.$mainGrid.children('div.filtered'),
                $visibleItems = $items.filter('.filtered:not(.hidden)'),
                itemCounter   = $visibleItems.index($item) + 1,
                type          = $item[0].getAttribute('data-type'),
                fileindex     = parseInt($item[0].getAttribute('data-id'), 10),
                itemindex     = $items.index($item),
                itemData      = self.albumData[fileindex],
                winWidth      = self.$window.width(),
                winHeight     = self.$window.height(),
                videoWidth    = 0,
                videoHeight   = 0,
                top           = winHeight/2,
                isOverlayOpen = !self.$overlaySource.is(':empty'),
                imageArr      = [];

            self.galleryIndex = itemindex;
            self.$overlayContent.data('itemId', fileindex);

            // preload the large images for smoother viewing
            for(var i = 1; i <= 3; i++ ) {
                if( $items[itemindex+i] && $items[itemindex+i].getAttribute('data-type') === 'photo' ) {
                    imageArr.push( self.albumData[ $items[itemindex+i].getAttribute('data-id') ].source );
                }
            }

            self.preloadImgs(imageArr);

            self.$otitle.html(itemData['title'] + '<span class="counter">'+ itemCounter + ' of ' + $visibleItems.length + '</span>');

            // calculate video player size
            if( type === 'youtube' || type === 'vimeo' || type ==='dailymotion' || type === 'video' ) {
                videoWidth = winWidth - 80;
                videoWidth > self.options.overlay.videoMaxWidth && (videoWidth = self.options.overlay.videoMaxWidth);

                videoHeight = parseInt(videoWidth*9/16, 10);  // use 16:9 aspect ratio

                if( winHeight <= 418 ) {
                    videoHeight = winHeight - 80;
                    videoWidth = parseInt(videoHeight*(16/9), 10);
                }
            }

            // process the various media types
            if( type === 'photo' ) {
                var $image;

                if( isOverlayOpen ) {
                    $image = self.$overlaySource.find('img');
                    self.resizeImage($image[0]);
                    self.$overlayLoader.hide();
                    self.overlayShow($image[0].width, $image[0].height, top, isOverlayOpen);
                }
                else {

                    // only show the loading animation if more than 150ms elapsed to load image
                    var loaderTimer = setTimeout(function() {
                        self.$overlayLoader.css('top', top).show();
                    }, 150);

                    // IE fix to force load image
                    if( self.msie ) {
                        self.$overlay.css({ visibility: 'hidden', display: 'block' });
                        self.$overlayContent.css({ visibility: 'hidden', display: 'block' });
                    }

                    $image = $('<img src="'+ itemData['source'] +'" alt="" />').appendTo(self.$overlaySource);
                    $image[0].onload = function(){
                        $image[0].setAttribute('data-naturalwidth', $image[0].width);
                        $image[0].setAttribute('data-naturalheight', $image[0].height);

                        self.resizeImage( $image[0] );

                        var iw = $image[0].width, ih = $image[0].height;

                        if( self.msie ) {
                            self.$overlay.css({ visibility: 'visible', display: 'none' });
                            self.$overlayContent.css({ visibility: 'visible', display: 'none' });
                        }

                        loaderTimer && clearTimeout(loaderTimer);
                        self.$overlayLoader.hide();

                        self.overlayShow(iw, ih, top);
                    };
                }
            }

            else if( type === 'audio') {
                var audio = '<audio controls>',
                    safariAudio = '<audio controls',
                    $thumb = $item.find('img.item-thumb'),
                    thumbHeight;

                if( self.options.gridType === 'rows' ) {
                    thumbHeight = parseInt($thumb[0].getAttribute('data-height'), 10);
                }
                else {
                    $thumb.addClass('getSize');
                    thumbHeight = $thumb[0].height;
                    $thumb.removeClass('getSize');
                }

                if( itemData['mp3'] ) {
                    audio += '<source type="audio/mpeg" src="'+ itemData['mp3'] +'" />';
                    safariAudio += 'type="audio/mpeg" src="'+ itemData['mp3'] +'"></audio>';
                }
                else if( itemData['ogg'] ) {
                    audio += '<source type="audio/ogg" src="'+ itemData['ogg'] +'" />';
                }

                audio += '</audio>';

                if( !isOverlayOpen ) {
                    self.$overlaySource.append('<img class="audio-cover" src="'+itemData['thumbnail']+'"/>');

                    if( self.isSafari) {  // Safari (Windows) without Quicktime installed removes <source> tags. This is the fix
                        self.$overlaySource.append(safariAudio);
                    }
                    else {
                        self.$overlaySource.append(audio);
                    }
                }

                if( winWidth <= 480 ) {
                    if( isOverlayOpen ) {
                        self.player.setPlayerSize(winWidth - 80, 30);
                        self.player.setControlsSize();
                    }

                    self.overlayShow( winWidth - 80, thumbHeight + 50, top, isOverlayOpen);
                }
                else {
                    if( isOverlayOpen ) {
                        self.player.setPlayerSize(400, 30);
                        self.player.setControlsSize();
                    }

                    self.overlayShow( 400, thumbHeight + 50, top, isOverlayOpen);
                }

            }

            else if( type === 'youtube' ) {
                var vId = itemData['source'].split('v=')[1],
                    ytAutoplay = self.options.overlay.autoplay ? '&autoplay=1' : '',
                    video = '<iframe width="'+ videoWidth +'" height="'+ videoHeight +'" src="https://www.youtube.com/embed/'+ vId +'?hd=1&rel=0&enablejsapi=1'+ ytAutoplay +'" frameborder="0" allowfullscreen></iframe>';

                if( !isOverlayOpen ) {
                    var iframe = self.$overlaySource.append(video).find('iframe');
                    self.meElem = {
                        pluginType: 'youtube',
                        pause: function(){
                            iframe[0].contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                        }
                    };
                }
                else {
                    self.$overlaySource.find('iframe').attr('width', videoWidth).attr('height', videoHeight);
                }

                self.overlayShow( videoWidth, videoHeight, top, isOverlayOpen);
            }

            else if( type === 'vimeo' ) {
                var vId = itemData['source'].split('/').pop(),
                    vAutoplay = self.options.overlay.autoplay ? '&autoplay=1' : '',
                    url = 'https://player.vimeo.com/video/'+ vId,
                    video = '<iframe src="'+ url +'?api=1'+ vAutoplay +'" width="'+ videoWidth +'" height="'+ videoHeight +'" frameborder="0" webkitAllowFullScreen allowFullScreen></iframe>';

                if( !isOverlayOpen ) {
                    var iframe = self.$overlaySource.append(video).find('iframe');
                    self.meElem = {
                        pluginType: 'vimeo',
                        pause: function(){
                            iframe[0].contentWindow.postMessage('{"method":"pause"}', url);
                        }
                    };
                }
                else {
                    self.$overlaySource.find('iframe').attr('width', videoWidth).attr('height', videoHeight);
                }

                self.overlayShow( videoWidth, videoHeight, top, isOverlayOpen);
            }

            else if( type === 'dailymotion' ) {
                var vId = itemData['source'].split('/').pop(),
                    vAutoplay = self.options.overlay.autoplay ? '&autoplay=1' : '',
                    url = 'https://www.dailymotion.com/embed/video/'+ vId,
                    video = '<iframe src="'+ url +'?api=postMessage'+ vAutoplay +'" width="'+ videoWidth +'" height="'+ videoHeight +'" frameborder="0" webkitAllowFullScreen allowFullScreen></iframe>';

                if( !isOverlayOpen ) {
                    var iframe = self.$overlaySource.append(video).find('iframe');
                    self.meElem = {
                        pluginType: 'dailymotion',
                        pause: function(){
                            iframe[0].contentWindow.postMessage('pause', '*');
                        }
                    };
                }
                else {
                    self.$overlaySource.find('iframe').attr('width', videoWidth).attr('height', videoHeight);
                }

                self.overlayShow( videoWidth, videoHeight, top, isOverlayOpen);
            }

            else if( type === 'video') {
                var video = '<video controls width="'+ videoWidth +'" height="'+ videoHeight +'">',
                    safariVideo = '<video controls width="'+ videoWidth +'" height="'+ videoHeight +'"';

                if( itemData['mp4'] ) {
                    var mp4src = self.isMobile && itemData['mobileMp4'] ? itemData['mobileMp4'] : itemData['mp4'];
                    video += '<source type="video/mp4" src="'+ mp4src +'" />';
                    safariVideo += 'type="video/mp4" src="'+ mp4src +'"></video>';
                }

                if( itemData['webm'] ) {
                    video += '<source type="video/webm" src="'+ itemData['webm'] +'" />';
                }

                if( itemData['ogv'] ) {
                    video += '<source type="video/ogg" src="'+ itemData['ogv'] +'" />';
                }

                video += '</video>';

                if( !isOverlayOpen ) {
                    if(self.isSafari) {  // Same Safari fix
                        self.$overlaySource.append(safariVideo);
                    }
                    else {
                        self.$overlaySource.append(video);
                    }
                }
                else {
                    self.player.setPlayerSize(videoWidth, videoHeight);
                    self.player.setControlsSize();
                    !self.isiOS && !self.isAndroid && self.player.media.setVideoSize(videoWidth, videoHeight);
                }

                self.overlayShow( videoWidth, videoHeight, top, isOverlayOpen);
            }
        },



        // function to show overlay
        overlayShow: function (mw, mh, top, isOverlayOpen) {
            var self      = this,
                itemnum   = self.$mainGrid.children('div.filtered:not(.hidden)').length,
                winWidth  = self.$window.width(),
                winHeight = self.$window.height(),
                ovWidth   = mw,
                $details  = self.$overlay.find('div.details'),
                trans     = self.options.overlay.itemTransition,
                maskSpeed = self.$mask[0].offsetHeight ? 0 : 400;

            !isOverlayOpen && self.$overlay.css({ display: 'block', visibility: 'hidden'});
            self.$overlayContent.css({width: ovWidth}).show();

            var captionHeight = self.$otitle.outerHeight(true),
                ovHeight      = mh + captionHeight,
                marginTop     = -ovHeight/2,
                marginLeft    = winWidth <= 480 ? -self.$overlayContent.outerWidth()/2 : -mw/2;

            !isOverlayOpen && self.$overlayContent.hide();

            if( self.galleryIndex === 0 ) {
                self.$prevItem.hide();
                self.$nextItem.show();
            }
            else if( self.galleryIndex === itemnum - 1 ) {
                self.$prevItem.show();
                self.$nextItem.hide();
            }
            else {
                self.$prevItem.show();
                self.$nextItem.show();
            }

            trans === 'slideLeft' && (trans = 'slideRightBig');
            trans === 'bounceLeft' && (trans = 'bounceRight');

            !isOverlayOpen && self.$overlay.css({ display: 'block', visibility: 'visible'});

            self.$mask
                .css({ height: $(document).height(), width: $(document).width(), display: 'block' })
                .velocity({ opacity: [1, 0], translateY: [0, '-100%'], translateZ: 0 }, maskSpeed, function() {

                    self.$overlayContent.css({width: ovWidth, height: ovHeight, top: top, marginTop: marginTop, marginLeft: marginLeft });

                    if( !isOverlayOpen ) {
                        self.$overlayContent
                        .addClass('animating')
                        .velocity('finish', true)
                        .velocity('transition.'+trans+'In', function() {
                            self.$overlayContent.removeClass('animating');
                            self.options.enableDeepLinking && self.updateItemLink();
                            self.onOverlayOpen();
                        })
                        .find('audio,video').mediaelementplayer({
                            audioWidth: mw,
                            videoWidth: mw,
                            videoHeight: mh,
                            hideVolumeOnTouchDevices: self.isAndroid,
                            pauseOtherPlayers: false,
                            mode: self.isChrome && !self.isiOS && !self.isAndroid ? 'shim' : 'auto',
                            success: function(mediaElement, domObject, player) {
                                self.meElem = mediaElement;
                                self.player = player;

                                if( self.ie9js ) {   // reapply css styles when using IE9.js
                                    IE7.recalc();
                                }

                                if( self.options.overlay.autoplay ) {  // if autoplay option is chosen
                                    mediaElement.play();
                                }

                                // show fullscreen button for iOS devices (which has been hidden using css)
                                if( self.isiOS ) {
                                    mediaElement.addEventListener('loadedmetadata', function() {
                                        player.container.find('div.mejs-fullscreen-button').css('visibility', 'visible');
                                    }, false);
                                }
                            }
                        });
                    }
                });
        },



        // navigate through items by clicking on next/prev buttons in the overlay
        overlayPrev: function(){
            var self = this,
                trans = self.options.overlay.itemTransition;

            trans === 'slideLeft' && (trans = 'slideLeftBig');

            if( self.galleryIndex - 1 < 0 ) {
                return;
            }

            self.$overlayContent.velocity('transition.'+trans+'Out', function() {
                self.clearOverlaySource();
                self.$mainGrid.children('div.filtered').eq(self.galleryIndex-1).find('a.show-source').trigger(self.clickType);
            });
        },



        overlayNext: function(){
            var self = this,
                trans = self.options.overlay.itemTransition;

            trans === 'slideLeft' && (trans = 'slideLeftBig');

            if( self.galleryIndex + 1 === self.$mainGrid.children('div.filtered:not(.hidden)').length ) {
                return;
            }

            self.$overlayContent.velocity('transition.'+trans+'Out', function() {
                self.clearOverlaySource();
                self.$mainGrid.children('div.filtered').eq(self.galleryIndex+1).find('a.show-source').trigger(self.clickType);
            });
        },



        // code to close overlay
        overlayClose: function(){
            var self = this;

            self.$overlay.hide().removeData('iframeVideoPlaying');

            self.$overlayContent.add(self.$mask).velocity('fadeOut', 500, function() {
                self.onOverlayClose();
                self.clearOverlaySource();

                if( self.options.enableDeepLinking ) {
                    var curHash = window.location.hash;
                    if( curHash.indexOf('fgid') !== -1 ) {
                        var newHash = curHash.split('&').shift();

                        if( newHash !== '#' ) {
                            window.location.hash = newHash;
                        }
                        else {
                            var top = self.$window.scrollTop();
                            window.location.hash = '';
                            self.$window.scrollTop(top);
                        }
                    }
                }
            });
        },



        // clear out the overlay contents
        clearOverlaySource: function() {
            var self = this;

            // destroy any previous instance of the ME player
            // don't use ME's own remove() method as it forces exit from fullscreen
            if( self.player ) {
                self.player.media.pluginType !== 'native' && self.player.media.pluginElement && $('#' + self.player.media.pluginElement.id).parent().remove();

                // Remove the player from the mejs.players object so that pauseOtherPlayers doesn't blow up when trying to pause a non existent flash api.
                delete mejs.players[self.player.id];
                self.player.globalUnbind();
                self.player = null;
            }

            self.$overlaySource.empty();
        },



        // handle the touch events in the overlay
        handleOverlayTouch: function(e) {
            var self = this;

            if( e.type === 'touchstart' ) {
                $.data(self.$overlay[0], 'touchStartPos', e.originalEvent.touches[0].pageX);
            }
            else if( e.type === 'touchmove' ) {
                e.preventDefault();
                $.data(self.$overlay[0], 'touchEndPos', e.originalEvent.touches[0].pageX);
            }
            else if( e.type === 'touchend' ) {
                if( !$.data(self.$overlay[0], 'touchEndPos') ) {   // ensure that taps/clicks are not prcessed
                    return;
                }

                if( $.data(self.$overlay[0], 'touchEndPos') - $.data(self.$overlay[0], 'touchStartPos') >= 100 ) {
                    self.overlayPrev();
                }
                else if( $.data(self.$overlay[0], 'touchEndPos') - $.data(self.$overlay[0], 'touchStartPos') <= -100 ) {
                    self.overlayNext();
                }

                $.data(self.$overlay[0], 'touchEndPos', null);
            }
        },



        // preload large/source images for smoother loading in overlay
        preloadImgs: function(urlArr) {
            var self = this,
                len = urlArr.length;

            if( len === 0 ) {
                return;
            }

            for( var i = 0; i < len; i++ ) {
                var img = new Image;
                img.src = urlArr[i];
            }
        },



        // function to resize images if they are larger than browser window
        resizeImage: function(img) {
            if( !img ) {
                return;
            }

            var self      = this,
                winWidth  = self.$window.width(),
                winHeight = self.$window.height(),
                maxw      = winWidth - 120,
                maxh      = winHeight - 40 - 50,  // 20px gap from window top/bottom and 50px for caption
                maxr      = maxw/maxh,
                iw        = img.getAttribute('data-naturalwidth') || img.width,
                ih        = img.getAttribute('data-naturalheight') || img.height,
                imgr      = iw/ih,


            maxw = maxw < 0 ? winWidth - 40 : maxw;  // just consider the overlay padding of 20px

            if( maxh < 50 ) {
                self.$overlay.css({ display: 'block', visibility: 'hidden' });
                self.$overlayContent.show();
                maxh = winHeight - self.$otitle.outerHeight(true);
                self.$overlayContent.hide();
                self.$overlay.css({ display: 'none', visibility: 'visible' });
            }

            if( iw > maxw || ih > maxh ) {
                if( imgr === maxr ) {
                    iw = maxw;
                    ih = maxh;
                }
                else {
                    iw = maxh*imgr;
                    ih = maxh;

                    if(iw > maxw) {
                        iw = maxw;
                        ih = maxw/imgr;
                    }
                }
            }

            img.width = iw;
            img.height = ih;
        },


        // handle window resize
        handleResize: function(e) {
            var self = this;

            // don't do anything if media player is fullscreen
            if( self.player && self.player.isFullScreen ) {
                return;
            }

            if( self.$galleryContainer[0].offsetWidth <= 480 ) {
                self.$menu.addClass('small');
            }
            else {
                self.$menu.removeClass('small');
            }

            self.recreateGrid();

            // resize overlay and its contents if open
            if( self.$overlay[0].style.display === 'block' ) {
                var resizeFrame = self.requestAnimFrame();
                resizeFrame(function() {
                    self.$mainGrid.find('div.item').eq(self.galleryIndex).find('a.show-source').trigger(self.clickType);
                });
            }
        },



        // handle keyboard events
        handleKeys: function(e) {
            var key = e.keyCode || e.charCode,
                self = this;

            if( self.$overlay.is(':visible') ) {
                if( key === 39 ) {  // right key
                    self.overlayNext();
                }
                else if( key === 37 ) {  // left key
                    self.overlayPrev();
                }
                else if( key === 27 ) {  // esc key
                    self.overlayClose();
                }
            }
        },



        // make the player fullscreen or exit from it
        handleFullscreen: function() {
            var self = this,
                $btn = self.$menu.find('li.fullscreen');

            if( !$btn.hasClass('active') &&
                (!document.fullscreenElement &&    // alternative standard method
                !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) ) {  // current working methods
                if( self.$galleryContainer[0].requestFullscreen ) {
                    self.$galleryContainer[0].requestFullscreen();
                }
                else if( self.$galleryContainer[0].mozRequestFullScreen ) {
                    self.$galleryContainer[0].mozRequestFullScreen();
                }
                else if( self.$galleryContainer[0].webkitRequestFullscreen ) {
                    self.$galleryContainer[0].webkitRequestFullscreen();
                }
                else if( self.$galleryContainer[0].msRequestFullscreen ) {
                    self.$galleryContainer[0].msRequestFullscreen();
                }

                $btn.addClass('active');
                self.options.loadItemChunks && self.options.loadChunksOnScroll && self.$galleryContainer.hasClass('chunked') && self.setupAutoChunkLoading(true);
            }
            else {
                if(document.exitFullscreen) {
                    document.exitFullscreen();
                }
                else if(document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
                else if(document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                }
                else if(document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }

                $btn.removeClass('active');
                self.options.loadItemChunks && self.options.loadChunksOnScroll && self.$galleryContainer.hasClass('chunked') && self.setupAutoChunkLoading(false);
            }
        },



        // fix the menu at the top of the page
        setupMenuLock: function() {
            var self = this,
                scrollTimer,
                scrollFrame = self.requestAnimFrame();

            self.lockset = false;

            self.$scrollElem.on('scroll.menu', function() {
                scrollFrame( self.fixMenu.bind(self) );
            });
        },



        // helper function to fix the menu on scroll
        fixMenu: function() {
            var self          = this,
                menuHeight    = self.$menu[0].offsetHeight,
                galleryHeight = self.$galleryContainer[0].offsetHeight,
                menuTopPos    = self.$galleryContainer.offset().top,
                startPos      = menuTopPos - self.options.menuFixOffset,
                endPos        = startPos + (galleryHeight - menuHeight),
                pos           = self.$scrollElem.scrollTop();

            if( !self.lockset && pos > startPos && pos < endPos ) {
                self.$galleryContainer.css('padding-top', self.$menu.outerHeight(true) );
                self.$menu.css({left: self.$menu.offset().left, top: self.options.menuFixOffset, width: self.$menu[0].offsetWidth}).addClass('fixed').removeClass('scroll-end');
                self.lockset = true;
            }
            else if( (self.lockset && (pos <= startPos || pos >= endPos)) || pos >= endPos ) {
                self.$menu.removeClass('fixed').css({left: '', top: '', width: ''});

                if( pos > endPos ) {
                    self.$menu.addClass('scroll-end');
                }
                else {
                    self.$galleryContainer.css('padding-top', '');
                }

                self.lockset = false;
            }
        },



        // show/hide the search box
        showSearchBox: function(e) {
            var self = this,
                $li = $(e.target).closest('li'),
                $input = $li.find('input'),
                val = $.trim($input.val());

            if( $li.hasClass('active') ) {
                $input.velocity({opacity: [0,1]}, {display: 'none', duration: 400, complete: function() {
                    $li.removeClass('active');
                }});

                if( val.length > 0 ) {
                    $input.val('');
                    self.layoutItems(self.$mainGrid.children('div.item'), null, false);  // show all items
                }
            }
            else {
                $li.addClass('active');
                $input.velocity({opacity: [1,0]}, {display: 'block', duration: 400, complete: function() {
                    $input.focus();
                }});
            }
        },



        // filter playlist items based on search input
        searchFilter: function() {
            var self = this,
                val = $.trim( self.$menu.find('input').val().toLowerCase() ),
                $items = self.$mainGrid.children('div.item'),
                $filteredItems;

            // do not filter if less then 2 characters are entered
            if( val.length > 0 && val.length < 2 ) {
                return;
            }

            // remove the "active" class from the filter menu items
            self.$menu.find('li.filter').removeClass('active');

            if( val.length === 0 ) {
                $filteredItems = $items;
            }
            else {
                if( self.options.searchBy === 'title' ) {
                    $filteredItems = $items.find('div.card-image span.card-title').filter(':contains(' + val + ')').closest('div.item');
                }
                else if( self.options.searchBy === 'categories' ) {
                    $filteredItems = $items.filter(function() {
                        var catAttr = this.getAttribute('data-categories').toLowerCase();
                        if( catAttr.indexOf(val) !== -1 ) {
                            return true;
                        }
                    });
                }
            }

            var $unfilteredItems = $items.not($filteredItems);
            $unfilteredItems.removeClass('filtered');
            $filteredItems.addClass('filtered');
            self.layoutItems($filteredItems, $unfilteredItems, false);
        },



        // update the deep link for the item when overlay is opened
        updateItemLink: function() {
            var self = this,
                curHash = window.location.hash.substring(1),
                itemHash = '&fgid='+self.gid;

            self.albumIndex !== null && ( itemHash += '&album='+self.albumIndex );
            itemHash += '&item=' + self.$overlayContent.data('itemId');

            if( curHash === '' ) {
                window.location.hash = '#' + itemHash;
            }
            else {
                if( curHash.indexOf('fgid') !== -1 ) {
                    var hashArr = curHash.split('&');
                    window.location.hash = hashArr[0] + itemHash;
                }
                else {
                    window.location.hash = curHash + itemHash;
                }
            }
        },



        // get gallery params from location hash
        getHashParams: function() {
            var curHash = window.location.hash,
                hashArr = [],
                params = {};

            if( curHash.indexOf('fgid') !== -1 ) {
                hashArr = curHash.split('&');
                hashArr.shift();

                $.each(hashArr, function(i, keyval)  {
                    keyval = keyval.split('=');
                    params[keyval[0]] = parseInt(keyval[1], 10);
                });

                return params;
            }
            else {
                return null;
            }
        },



        // show item overlay based on url hash
        showItemFromHash: function() {
            var self = this,
                params = self.getHashParams();

            if( params && params['fgid'] === self.gid ) {
                if( params.hasOwnProperty('album') && params['album'] !== self.albumIndex ) {
                    self.$overlayContent.hide();
                    self.clearOverlaySource();
                    self.$albums.find('li').eq(params['album']).trigger(self.clickType);
                }
                else {
                    if( self.$overlay[0].offsetHeight > 0 ) {
                        if( params['item'] === self.$overlayContent.data('itemId') ) {
                            return;
                        }

                        self.$overlayContent.hide();
                        self.clearOverlaySource();
                    }

                    self.$mainGrid.children('div.item').filter('[data-id="'+params['item']+'"]').find('a.show-source').trigger(self.clickType);
                }
            }
            else {
                self.$overlay[0].offsetHeight > 0 && self.overlayClose();
            }
        },



        // handle social sharing of items
        shareItem: function(e) {
            e.stopPropagation();

            var self    = this,
                $link   = $(e.target),
                $item   = self.$mainGrid.children('div.sharing-active'),
                itemUrl = $item.find('a.share')[0].getAttribute('data-link'),
                data    = self.albumData[ $item[0].getAttribute('data-id') ],
                fileUrl = '',
                title   = $item[0].getAttribute('data-title'),
                url     = '',
                left    = window.screen.width/2 - 500/2,
                top     = window.screen.height/2 - 300/2;

            var a = document.createElement('a');
            a.href = '#' + window.location.hash.substring(1) + itemUrl;
            itemUrl = a.href;

            itemUrl = encodeURIComponent(itemUrl);
            title = encodeURIComponent(title);

            if( $link.hasClass('facebook') ) {
                url = 'https://www.facebook.com/sharer/sharer.php?u='+itemUrl;
            }
            else if( $link.hasClass('twitter') ) {
                url = 'https://twitter.com/intent/tweet/?text='+title+'&url='+itemUrl;
            }
            else if( $link.hasClass('google') ) {
                url = 'https://plus.google.com/share?url='+itemUrl;
            }
            else if( $link.hasClass('pinterest') ) {
                if( data.source.indexOf('http') === -1 ) {
                    a.href = data.type === 'photo' ? data.source : data.thumbnail;
                    fileUrl = encodeURIComponent(a.href);
                }

                url = 'https://www.pinterest.com/pin/create/button/?url='+itemUrl+'&media='+fileUrl+'&description='+data.title;
            }

            window.open(url, '', 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,width=500,height=300,top=' + top + ',left=' + left);
        },



        // handle the ripple effect when clicking on menu items
        handleRippleEffect: function(e) {
            var self = this,
                $btn = $(e.target),
                offset = $btn.offset(),
                $ripple, d, x, y;

            if( $btn.find('span.ripple').length === 0){
                $btn.prepend('<span class="ripple"></span>');
            }

            $ripple = $btn.find('span.ripple').removeClass('animate');

            if( !$ripple[0].offsetHeight ){
                d = Math.max($btn[0].offsetWidth, $btn[0].offsetHeight);
                $ripple.css({height: d, width: d});
            }

            x = e.pageX - offset.left - $ripple.width()/2;
            y = e.pageY - offset.top - $ripple.height()/2;

            $ripple.css({top: y, left: x}).addClass('animate');
        },



        // bind the various events
        bindEvents: function() {
            var self = this;

            self.$window.on('resize orientationchange fullscreenchange mozfullscreenchange webkitfullscreenchange MSFullscreenChange', self.handleResize.bind(self));

            // show album
            self.$albums.on(self.clickType, 'li', self.getAlbum.bind(self));

            // go back to albums page
            self.$menu.find('li.back').on(self.clickType, self.backToAlbums.bind(self));

            // show dropdown menu
            self.$menu.on(self.clickType, 'li.dropdown-button > a', function(e) {
                $(this)
                .next('ul.dropdown')
                .velocity('transition.expandIn', {duration: 300, display: 'block'})
                .end()
                .parent()
                .siblings('li.dropdown-button')
                .find('ul.dropdown')
                .velocity('transition.expandOut', 100);
            });

            // hide dropdown menu
            $(document).on(self.clickType, function(e) {
                var $target = $(e.target);

                if( $target.closest('div.flow-menu').length === 0 || $target.closest('li.dropdown-button').length === 0 ) {
                    self.$menu.find('ul.dropdown').filter(':visible').velocity('transition.expandOut', 100);
                }
            });


            // handle fullscreen
            self.$menu.find('li.fullscreen').on(self.clickType, self.handleFullscreen.bind(self));

            // remove the "active" class from the fullscreen button on exit from fullscreen using ESC key
            self.$window.on('fullscreenchange mozfullscreenchange webkitfullscreenchange MSFullscreenChange', function() {
                if( document.fullscreenElement === null || document.mozFullScreenElement === null || document.webkitFullscreenElement === null || document.msFullscreenElement === null ) {
                    self.$menu.find('li.fullscreen').removeClass('active');
                }
            });

            // bind the click event on the "add" button for loading item chunks
            self.options.loadItemChunks && !self.options.loadChunksOnScroll && self.$addButton.on(self.clickType, self.appendItems.bind(self));

            // bind events for filtering
            self.$menu.on(self.clickType, 'li.filter', self.filterItems.bind(self));

            // bind events for sorting
            self.options.sortBy.length > 0 && self.$menu.on(self.clickType, 'li.sort', self.sortItems.bind(self));

            // show and close captions
            self.$mainGrid.on(self.clickType, '.show-info', self.showItemInfo.bind(self));

            self.$mainGrid.on(self.clickType, 'i.close', self.hideItemInfo.bind(self));

            // show the sharing tooltip and handle the sharing action
            if( self.options.enableSocialShare ) {
                self.$mainGrid.on(self.clickType, 'a.share', function(e) {
                    e.stopPropagation();

                    var $this = $(this),
                        $item = $this.closest('div.item'),
                        left = $item[0].offsetLeft + this.offsetLeft,
                        top = self.$mainGrid[0].offsetTop + $item[0].offsetTop + this.offsetTop + 30;

                    $item.addClass('sharing-active').siblings().removeClass('sharing-active');
                    self.$shareTooltip.css({left: left, top: top}).velocity('transition.expandIn', 400);
                });

                $(document).on(self.clickType, function() {
                    self.$shareTooltip.is(':visible') && self.$shareTooltip.velocity('transition.expandOut', 100);
                });

                self.$shareTooltip.on(self.clickType, self.shareItem.bind(self));
            }


            // show overlay
            self.$mainGrid.on(self.clickType, 'a.show-source', self.overlayCreate.bind(self));

            // hide overlay
            self.$overlayClose.on(self.clickType, self.overlayClose.bind(self));
            self.$overlay.on(self.clickType, function(e) {
                if( !$.contains(self.$overlay[0], e.target) ) {
                    self.overlayClose();
                }
            });

            // go to next/prev item while overlay is open
            self.$prevItem.on(self.clickType, self.overlayPrev.bind(self));

            self.$nextItem.on(self.clickType, self.overlayNext.bind(self));

            self.$overlay.on('touchstart touchmove touchend', self.handleOverlayTouch.bind(self));

            // bind keyboard events
            $(document).on('keydown', self.handleKeys.bind(self));

            // show hide the search box
            if( self.options.showSearchFilter ) {
                self.$menu.find('.search a').on(self.clickType, self.showSearchBox.bind(self));

                var searchTimer;
                self.$menu.find('input').on('keyup', function() {
                    if( searchTimer ) {
                        clearTimeout(searchTimer);
                    }

                    searchTimer = setTimeout(self.searchFilter.bind(self), 250);
                });
            }

            // if deeplinking enabled show item based on url hash
            self.$window.on('hashchange', self.showItemFromHash.bind(self));

            self.$galleryContainer.on(self.clickType, '.ripple-effect', self.handleRippleEffect.bind(self));
        },



        // debounce a function
        debounce: function(func, wait, immediate) {
            var self = this;
            return function() {
                var context = self, args = arguments;
                var later = function() {
                    self.debounceTimeout = null;
                    if (!immediate) func.apply(context, args);
                };
                var callNow = immediate && !self.debounceTimeout;
                clearTimeout(self.debounceTimeout);
                self.debounceTimeout = setTimeout(later, wait);
                if (callNow) func.apply(context, args);
            };
        },



        // requestAnimationFrame polyfill
        requestAnimFrame: function() {
            return  window.requestAnimationFrame       ||
                    window.webkitRequestAnimationFrame ||
                    window.mozRequestAnimationFrame    ||
                    window.msRequestAnimationFrame     ||
                    window.oRequestAnimationFrame      ||
                    function(callback) {
                        window.setTimeout(callback, 1000 / 60);
                    };
        },



        galleryAPI: function() {
            var self = this;

            return {
                openAlbum: function(index) {
                    self.$overlayContent.hide();
                    self.clearOverlaySource();
                    self.$albums.find('li').eq(index).trigger(self.clickType);
                },

                openItem: function(index) {
                    self.$mainGrid.find('div.item').eq(index).find('a.show-source').trigger(self.clickType);
                },

                showNext: function() {
                    self.overlayNext();
                },

                showPrev: function() {
                    self.overlayPrev();
                },

                closeItem: function() {
                    self.overlayClose();
                },

                getItemLink: function(index) {
                    var url = self.$mainGrid.find('div.item').eq(index).find('a.share')[0].getAttribute('data-link');
                    var a = document.createElement('a');
                    a.href = '#' + window.location.hash.substring(1) + url;
                    url = a.href;

                    return url;
                },

                getItemInfo: function(index) {
                    var id = self.$mainGrid.find('div.item').eq(index).data('id');

                    return self.albumData[id];
                },

                getCurrentFilter: function() {
                    return self.$menu.find('li.filter.active a').text();
                },

                getCurrentSort: function() {
                    return self.$menu.find('li.sort.active a').text();
                },

                getNumItems: function() {
                    return self.$mainGrid.find('div.item').length;
                },

                getNumVisibleItems: function() {
                    return self.$mainGrid.find('div.item:not(.hidden)').length;
                },

                getNumAlbums: function() {
                    return self.config.albums ? self.config.albums.length : 0;
                }
            };
        },



        // gallery events
        onSetup: function() {
            this.options.onSetup.call(this.$galleryContainer[0]);
            this.$galleryContainer.trigger('onSetup');
        },

        onAlbumLoad: function() {
            var albumIndex = this.$albums.find('li.current').index();
            this.options.onAlbumLoad.call(this.$galleryContainer[0], albumIndex);
            this.$galleryContainer.trigger('onAlbumLoad', [albumIndex]);
        },

        onOverlayOpen: function() {
            this.options.onOverlayOpen.call(this.$galleryContainer[0], this.galleryIndex);
            this.$galleryContainer.trigger('onOverlayOpen', [this.galleryIndex]);
        },

        onOverlayClose: function() {
            this.options.onOverlayClose.call(this.$galleryContainer[0], this.galleryIndex);
            this.$galleryContainer.trigger('onOverlayClose', [this.galleryIndex]);
        },



        // detect if css transforms are supported
        getSupportedTransform: function () {
            var prefixes = 'transform WebkitTransform MozTransform OTransform msTransform'.split(' ');
            var div = document.createElement('div');
            for(var i = 0; i < prefixes.length; i++) {
                if(div && div.style[prefixes[i]] !== undefined) {
                    return prefixes[i];
                }
            }
            return false;
        }

    }; // end FlowGallery



    // create the jquery plugin
    $.fn.flowGallery = function(options) {
        var opts = $.extend( true, {}, $.fn.flowGallery.defaults, options );

        // $.extend deep copy merges arrays too, which we don't want
        if( $.isArray(options.sharers) ) {
            opts.sharers = options.sharers;
        }

        if( $.isArray(options.sortBy) ) {
            opts.sortBy = options.sortBy;
        }

        return this.each(function () {
            //prevent against multiple instantiations
            if( !$.data(this, 'flowGallery') ) {
                var gallery = Object.create(FlowGallery);
                gallery.init(opts, this);
                $.data(this, 'flowGallery', gallery.galleryAPI());
            }
        });
    };

    $.fn.flowGallery.defaults = {
        gridType: 'columns',  // rows, columns
        rowItemMinWidth: 170,
        justifyLastRow: false,
        columns: 4,  // number or object like {320: 1, 480:2, 720: 3} (applicable for columns type grid)
        horizontalGutter: 20,  // in px
        verticalGutter: 20,  // in px
        shuffleItems: false,
        albums: {
            enterSpeed: 600,
            enterAnimation: 'slideLeft', // fade, slideDown, slideLeft, slideRight, flipX, flipY, shrink, expand, swoop, whirl
            enterInSequence: true,
            sequenceDelay: 200,
            style: 'tiled',  // stacked, tiled
            pageTransition: 'shrink'  // fade, slideUp, slideLeft, expand, shrink
        },
        items: {
            enterSpeed: 600,
            enterAnimation: 'fade', // fade, slideDown, slideLeft, slideRight, flipX, flipY, shrink, expand, swoop, whirl
            enterInSequence: true,
            sequenceDelay: 200,
            style: 'card'  // card or tile (based on material design)
        },
        card: {
            captionMaxHeight: 200,  // in px (caption appears below thumb)
            alwaysShowCaption: true, // if enabled then title over thumb is hidden and shown below
            descriptionInCaption: true  // applicable when caption is always shown
        },
        alwaysShowThumbTitle: true,
        thumbTitleAnimation: 'slide', // fade, slide  (applicable if title is hidden)
        captionShowAnimation: 'slideUp',  // fade, slideUp, slideDown, pushUp, pushDown, expand, shrink, flipX, flipY (applicable when caption is hidden)
        captionAnimationSpeed: 400,
        youtubeAPIKey: '',
        useYoutubeThumbs: true,
        useVimeoThumbs: true,
        useDailymotionThumbs: true,
        newWindowLinks: true,
        loadItemChunks: true,
        loadChunksOnScroll: false,
        initialChunkSize: null,  // null to disable
        chunkSize: 10,
        enableDeepLinking: false,
        enableSocialShare: true,
        sharers: ['facebook', 'twitter', 'google', 'pinterest'],
        showFileTypeIcons: true,
        showGalleryMenuBar: true,
        showFilterMenu: true,
        showFileTypeFilters: true,
        categoryFilters: [],  // array of custom category filters
        hideEmptyCategories: true,
        sortBy: ['title', 'type'],
        sortOrder: 'ascending',
        showSearchFilter: true,
        searchBy: 'title',  // title, categories
        menuComponentNames: {
            filter: {
                menu: 'Filter',
                all: 'All',
                photo: 'Photo',
                audio: 'Audio',
                video: 'Video'
            },
            sort: {
                menu: 'Sort',
                original: 'Original',
                title: 'Title',
                type: 'Type'
            },
            albums: 'Albums',
            search: 'Type to filter'
        },
        layoutSpeed: 600,  // animation speed for placing items after filter/sort
        showFullscreenButton: true,
        fixMenuOnScroll: true,
        menuFixOffset: 0,
        overlay: {
            autoplay: false,
            videoMaxWidth: 800,  // the height will be set based on 16:9 aspect ratio
            itemTransition: 'shrink'  // fade, slideLeft, slideDown, bounceLeft, bounceDown, expand, shrink
        },
        getExifData: false,
        scanPhotoFolder: false,
        photoFolder: '',
        scanVideoFolder: false,
        videoFolder: '',
        detectMobile: false,
        configUrl: 'config.json',
        configData: {},
        enableCache: true,
        cacheFolder: 'cache',
        cacheFileName: 'config-cache.json',
        cacheInterval: 10,  // in minutes
        phpFolder: 'php',
        onSetup: function() {},
        onAlbumLoad: function(index){},
        onOverlayOpen: function(index){},
        onOverlayClose: function(index){}
    };


}) (jQuery, document, window);