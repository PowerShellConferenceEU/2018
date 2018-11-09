PowerShellConferenceEU.github.io
================================

[![Build Status](https://travis-ci.org/PowerShellConferenceEU/PowerShellConferenceEU.github.io.svg?branch=Dev)](https://travis-ci.org/PowerShellConferenceEU/PowerShellConferenceEU.github.io)

This is the [website](http://psconf.eu "website") for PowerShell Conference Europe. The site is bilingual; supporting English as the main language as well German.

The site is hosted on [GitHub Pages](https://pages.github.com/ "GitHub Pages") and are running on the [Jekyll](http://jekyllrb.com/ "Jekyll") engine, with [Bootstrap](http://getbootstrap.com/ "Bootstrap") as the main styling framework. We have tried to make the site structure easy to maintain as well as update, as well as multilingual. It should be fairly easy to add inn extra languages if needed.

** A note about encoding **
It's important that all files are encoded in UTF-8, as Jekyll will do strange things if the file encoding is wrong. Even using UTF-8-DOM is frowned upon by our Mr. Jekyll I'm afraid.

Site structure
--------------
The site follows standard Jekyll site structure.

 * _data
 * _includes
 * _layouts
 * css
 * de
 * img
 * js

**_data**
This folder contains data files read and used by Jekyll. These files are YAML files and are used for organized data, such as the navigation of the site as well as simple translations and event data.

**_includes**
This folder is used for partial HTML files. The root folder consists of files that are shared between languages, and language specific files are located in either the *de* or *en* subfolders.

**_layouts**
This folder holds the layout files used by Jekyll. There are two custom layouts created for this site; site.html and scaffolding.html. The *site* layout is used to structure the different sections of the site, while the *scaffolding* layout contain most of the HTML structure needed for a website.

**css**
This folder consists of local style sheet files (CSS). Note that some of the style sheets (like the Bootstrap CSS) are hosted on CDNs.

**de**
This folder holds the index.html for the German version of the site. This is needed to get the *lang* variable set correctly for the translation of the site.

**img**
Images the site uses are stored in this folder.

**js**
This folder holds local JavaScript files. Note that some JavaScript files are hosted on CDNs.

About Speaker Pictures
----------------------
Speaker pictures should be in 300x200px (height x width). This will produce the best result with our current gallery plugin.

Credits
-------
The following frameworks and third-party plugins/modules are used on this site:
- [Bootstrap](http://getbootstrap.com/ "Bootstrap")
- [jquery-photoset-grid.js](http://stylehatch.github.io/photoset-grid/ "jquery-photoset-grid.js")
- [smooth-scroll.js](https://github.com/cferdinandi/smooth-scroll "smooth-scroll.js")
- [soon countdown pack*](http://codecanyon.net/item/soon-countdown-pack-responsive-jquery-plugin/9485513 "soon countdown pack")
- [overlay-bootstrap](https://github.com/karbonn/Overlay-Bootstrap "overlay-bootstrap")
- [Flow Gallery*](http://codecanyon.net/item/flow-gallery-html5-multimedia-gallery/10741414 "Flow Gallery")

*Third party plugin. If you fork this project to use for another site, please remove this or you are in violation of the terms for this plugin.

About us
--------
This site is created and maintained by a team of volunteers. If any bugs are found, or you have any ideas for future improvements to the site, don't hesitate to contact us.