// smoothscroll
smoothScroll.init({
      speed: 500, // Integer. How fast to complete the scroll in milliseconds
      easing: 'easeOutQuint', // Easing pattern to use
      updateURL: false, // Boolean. Whether or not to update the URL with the anchor hash on scroll
      offset: 0, // Integer. How far to offset the scrolling anchor location in pixels
});

// photogrid
$('.photogrid').photosetGrid({
      // Set the gutter between columns and rows
      gutter: '5px',
      highresLinks: true,
      rel: 'venue-gallery',
      onComplete: function(){
            $('.photogrid').attr('style', '');
            $('.photogrid a').colorbox({
                  photo: true,
                  scalePhotos: true,
                  maxHeight:'90%',
                  maxWidth:'90%'
            });
      }
});

// Scroll to top
$(function(){
      $(document).on( 'scroll', function(){
            if ($(window).scrollTop() > 100) {
                  $('.back-to-top').addClass('show');
                  //console.log("Show scroll-to-top");
            } else {
                  $('.back-to-top').removeClass('show');
                  //console.log("Hide scroll-to-top");
            }
      });
});

// navbar shadow on scroll
$(document).ready(function(){
      $(window).scroll(function(){
            var y = $(window).scrollTop();
            if( y > 0 ){
                  $("#top-shadow").css({'display':'block', 'opacity':y/20});
            } else {
                  $("#top-shadow").css({'display':'block', 'opacity':y/20});
            }
      });
});

// google map
var map;

function initialize() {
      var location = {lat: 52.3760037, lng: 9.7691176};

      var mapOptions = {
            zoom: 17,
            center: location,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            scrollwheel: false
      };

      var map = new google.maps.Map(document.getElementById('venue-map'), mapOptions);

      var contentString = '<h2>Hannover Congress Centrum</h2><p>Theodor-Heuss-Platz 1-3<br>30175 Hannover<br>Germany</p><p>+49 511 81130</p><p><a href="http://www.hcc.de/">hcc.de</a></p><p><a href="https://www.google.no/maps/dir//Hannover+Congress+Centrum,+Theodor-Heuss-Platz+1-3,+30175+Hannover/@52.3760037,9.7691176,17z/data=!4m13!1m4!3m3!1s0x47b00b5af0dd0b79:0xbc2cad20ca00fdfe!2sHannover+Congress+Centrum!3b1!4m7!1m0!1m5!1m1!1s0x47b00b5af0dd0b79:0xbc2cad20ca00fdfe!2m2!1d9.7691176!2d52.3760037?hl=en">Directions</a></p>'

      var infowindow = new google.maps.InfoWindow({
            content: contentString
      });

      var marker = new google.maps.Marker({
            position: location,
            map: map,
            animation: google.maps.Animation.DROP,
            title: 'Hannover Congress Centrum'
      });

      marker.addListener('click', function() {
            infowindow.open(map, marker);
      });
}

google.maps.event.addDomListener(window, 'load', initialize);

// bootstrap tooltip
$(function () {
  $('[data-toggle="tooltip"]').tooltip()
})

// bootstrap popover
$(function () {
  $('[data-toggle="popover"]').popover()
})

// Flow Gallery
$('#speakers-gallery').flowGallery({
            gridType: 'columns',
            columns: {320: 2, 480: 3, 720: 4, 960: 5, 1200: 6},
            //columns: 6,
            //rowItemMinWidth: 150,
            //justifyLastRow: false,
            horizontalGutter: 10,
            verticalGutter: 10,
            items: {style: 'card'},
            card: {
                alwaysShowCaption: true,
                descriptionInCaption: false
            },
            captionShowAnimation: 'pushUp',
            enableCache: false,
            enableDeepLinking: false,
            loadItemChunks: false,
            enableSocialShare: false,
            showFileTypeIcons: false,
            categoryFilters: ["United Kingdom","USA","Netherlands","Norway","Sweden","India","Germany","Serbia","Poland","Denmark","Canada","Belgium"],
            showFileTypeFilters: false,
            hideEmptyCategories: true,
            showFullscreenButton: false,
            showFilterMenu: true,
            showSearchFilter: true,
            showGalleryMenuBar: false,
            sortBy: [],
            fixMenuOnScroll: true,
            menuFixOffset: 50,
            configUrl: 'flowconfig.json'
        });

        $('#candids-gallery').flowGallery({
            gridType: 'columns',
            columns: {320: 2, 480: 3, 720: 4, 960: 5, 1200: 6},
            //columns: 6,
            //rowItemMinWidth: 150,
            //justifyLastRow: false,
            horizontalGutter: 10,
            verticalGutter: 10,
            items: {style: 'card'},
            card: {
                alwaysShowCaption: true,
                descriptionInCaption: false
            },
            captionShowAnimation: 'pushUp',
            enableCache: false,
            enableDeepLinking: false,
            loadItemChunks: false,
            enableSocialShare: false,
            showFileTypeIcons: false,
            categoryFilters: ["United Kingdom","USA","Netherlands","Norway","Sweden","India","Germany","Serbia","Poland","Denmark","Canada","Belgium"],
            showFileTypeFilters: false,
            hideEmptyCategories: true,
            showFullscreenButton: false,
            showFilterMenu: true,
            showSearchFilter: true,
            showGalleryMenuBar: false,
            sortBy: [],
            fixMenuOnScroll: true,
            menuFixOffset: 50,
            configUrl: 'candidsflowconfig.json'
        });
