/*jslint browser: true*/
/*global $, singleCourseSearch*/
(function () {
    'use strict';
    //Inject Needed Scripts
    var scriptSrcs = [
        "https://d3js.org/d3-dsv.v1.min.js",
        "https://ajax.googleapis.com/ajax/libs/jquery/3.1.1/jquery.min.js",
        "https://content.byui.edu/integ/gen/00134d04-34d1-47b8-9242-c29059c522ee/0/online.js",
        "https://content.byui.edu/integ/gen/2291aecd-be53-49eb-beff-9222931c76d1/0/singleCourseTemplate.js",
        "https://content.byui.edu/integ/gen/2291aecd-be53-49eb-beff-9222931c76d1/0/courseSearchTools.js",
        "https://content.byui.edu/integ/gen/2291aecd-be53-49eb-beff-9222931c76d1/0/singleCourseSearch.js"
    ];

    //For testing on local server only
    /*var scriptSrcs = [
        "https://d3js.org/d3-dsv.v1.min.js",
        "https://ajax.googleapis.com/ajax/libs/jquery/3.1.1/jquery.min.js",
        "https://content.byui.edu/integ/gen/00134d04-34d1-47b8-9242-c29059c522ee/0/online.js",
        "https://localhost:8000/src/singleCourseTemplate.js",
        "https://localhost:8000/src/courseSearchTools.js",
        "https://localhost:8000/src/singleCourseSearch.js"
    ];*/

    function addScript() {
        var src = scriptSrcs.shift(),
            scriptTag = document.createElement('script');
        scriptTag.src = src;
        if (scriptSrcs.length > 0) {
            scriptTag.onload = addScript;
        }
        document.body.appendChild(scriptTag);
    }

    addScript();

    function start() {
        // Initiage singleCourseSearch
        singleCourseSearch.init();
    }

    window.addEventListener('load', start);
}());