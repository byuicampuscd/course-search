(function () {
    "use strict";
    var topics = [];
    function LoopThroughModules(module) {
        var i, currentModule = {}, items = [];
        for (i in module.Modules) {
            currentModule = module.Modules[i];
            if (currentModule.Topics) {
                items = currentModule.Topics;
                topics.push(...items);
                console.log(currentModule.Topics.length);
                console.log("Running...");
            }
            LoopThroughModules(currentModule);
        }
    }

    function process(response) {
        LoopThroughModules(response);
        console.log(topics);
        getLinks(topics[0]);
    }
    var xhr = new XMLHttpRequest();
    var orgUnit = $("#orgunit").text();
    console.log(orgUnit);
    var children = "/d2l/api/le/1.5/" + orgUnit + "/content/toc";
    xhr.open("GET", children);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
            process(JSON.parse(xhr.responseText));
        }
    }
    xhr.send();


    function getLinks(topic) {
        var links = [];
        var url = "https://byui.brightspace.com" + topic.Url;
        var grabber = new XMLHttpRequest();
        console.log(url);
        grabber.open("GET", url);
        grabber.onreadystatechange = function () {
            if (grabber.readyState == XMLHttpRequest.DONE && grabber.status == 200) {
                console.log(grabber.responseText);
            }
            else {
                console.log(grabber.status);
            }
        }
        grabber.send();
    }

    function grabLinkFromText(text) {}
}());
