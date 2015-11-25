var document2svg = (function (util, browser, documentHelper, mediaQueryHelper, xmlserializer) {
    "use strict";

    var module = {};

    var zoomedElementSizingAttributes = function (size) {
        var closestScaledWith, closestScaledHeight,
            offsetX, offsetY;

        closestScaledWith = Math.round(size.viewportWidth);
        closestScaledHeight = Math.round(size.viewportHeight);

        offsetX = -size.left;
        offsetY = -size.top;

        var attributes = {
             'x': offsetX,
             'y': offsetY,
             'width': closestScaledWith,
             'height': closestScaledHeight
        };

        return attributes;
    };

    var workAroundCollapsingMarginsAcrossSVGElementInWebKitLike = function (attributes) {
        var style = attributes.style || '';
        attributes.style = style + 'float: left;';
    };

    var workAroundSafariSometimesNotShowingExternalResources = function (attributes) {
        /* Let's hope that works some magic. The spec says SVGLoad only fires
         * now when all externals are available.
         * http://www.w3.org/TR/SVG/struct.html#ExternalResourcesRequired */
        attributes.externalResourcesRequired = true;
    };

    var workAroundChromeShowingScrollbarsUnderLinuxIfHtmlIsOverflowScroll = function () {
        return '<style scoped="">html::-webkit-scrollbar { display: none; }</style>';
    };

    var serializeAttributes = function (attributes) {
        var keys = Object.keys(attributes);
        if (!keys.length) {
            return '';
        }

        return ' ' + keys.map(function (key) {
            return key + '="' + attributes[key] + '"';
        }).join(' ');
    };

    var convertDocumentToSvg = function (doc, size, zoomFactor) {
        var xhtml = xmlserializer.serializeToString(doc);
        var attributes = zoomedElementSizingAttributes(size);
        var svgZoomAttribute = '';

        browser.validateXHTML(xhtml);
        zoomFactor = zoomFactor || 1;
        if (zoomFactor !== 1) {
            svgZoomAttribute = 'style="transform:scale(' + zoomFactor + '); transform-origin: 0 0;"';
        }
        workAroundCollapsingMarginsAcrossSVGElementInWebKitLike(attributes);
        workAroundSafariSometimesNotShowingExternalResources(attributes);

        return (
            '<svg xmlns="http://www.w3.org/2000/svg"' +
                ' width="' + size.width + '"' +
                ' height="' + size.height + '"' +
                ' font-size="' + size.rootFontSize + '"' +
                ' ' + svgZoomAttribute +
                '>' +
                workAroundChromeShowingScrollbarsUnderLinuxIfHtmlIsOverflowScroll() +
                '<foreignObject' + serializeAttributes(attributes) + '>' +
                xhtml +
                '</foreignObject>' +
                '</svg>'
        );
    };

    module.getSvgForDocument = function (doc, size, zoomFactor) {
        documentHelper.rewriteTagNameSelectorsToLowerCase(doc);

        return mediaQueryHelper.needsEmWorkaround().then(function (needsWorkaround) {
            if (needsWorkaround) {
                mediaQueryHelper.workAroundWebKitEmSizeIssue(doc);
            }

            return convertDocumentToSvg(doc, size, zoomFactor);
        });
    };

    module.drawDocumentAsSvg = function (doc, options) {
        ['hover', 'active', 'focus', 'target'].forEach(function (action) {
            if (options[action]) {
                documentHelper.fakeUserAction(doc, options[action], action);
            }
        });

        return browser.calculateDocumentContentSize(doc, options)
            .then(function (size) {
                return module.getSvgForDocument(doc, size, options.zoom);
            });
    };

    return module;
}(util, browser, documentHelper, mediaQueryHelper, xmlserializer));
