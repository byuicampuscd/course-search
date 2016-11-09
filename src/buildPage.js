//Inject Needed Scripts
//var scriptSrcs = [
//    "https://ajax.googleapis.com/ajax/libs/jquery/3.1.1/jquery.min.js",
//    "https://content.byui.edu/integ/gen/00134d04-34d1-47b8-9242-c29059c522ee/0/online.js",
//    "https://content.byui.edu/integ/gen/2291aecd-be53-49eb-beff-9222931c76d1/0/template.js",
//    "https://content.byui.edu/integ/gen/2291aecd-be53-49eb-beff-9222931c76d1/0/courseSearch.js"
//];

var scriptSrcs = [
    "https://ajax.googleapis.com/ajax/libs/jquery/3.1.1/jquery.min.js",
    "https://content.byui.edu/integ/gen/00134d04-34d1-47b8-9242-c29059c522ee/0/online.js",
    "https://localhost:8000/src/template.js",
    "https://localhost:8000/src/courseSearch.js"
];

function addScript() {
    var src = scriptSrcs.shift(),
        scriptTag = document.createElement('script');
    scriptTag.src = src;
    if (scriptSrcs.length > 0) {
        scriptTag.onload = addScript;
    }
    document.body.appendChild(scriptTag);
};

addScript();

// Initiate Page
function init() {
    // Inject HTML
    document.querySelector('#main').innerHTML = template;
    // Initiage courseSearch
    courseSearch();
};

window.addEventListener('load', init);