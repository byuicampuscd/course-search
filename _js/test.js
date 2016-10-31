(function () {
    "use strict";
    var files = {};
    var links = {};

    function printToScreen(fileName, path, snippet) {
        var id = fileName.replace(' ', '');
        var snippetEl = document.createElement('p');
        snippetEl.appendChild(document.createTextNode(snippet));

        if (!document.getElementById(id)) {
            var liEl = document.createElement('li');
            var linkEl = document.createElement('a');
            var pathEl = document.createElement('span');

            linkEl.href = path;
            linkEl.innerHTML = fileName;

            pathEl.innerHTML = path;

            liEl.id = id;
            liEl.append(linkEl);
            liEl.append(pathEl);
            liEl.append(snippetEl);

            $('#results').append(liEl);
        } else {
            document.getElementById(id).append(snippetEl);
        }

    }

    function searchFile(path, searchString, fileName) {
        var search = new XMLHttpRequest();
        var url = "https://byui.brightspace.com" + path;
        url = encodeURI(url)
        search.open("GET", url);
        search.onreadystatechange = function () {
            if (search.readyState === search.DONE && search.status === 200) {
                var text = search.responseText.replace(/\n/g, "");
                var regEx = new RegExp(searchString, 'ig');
                var match;
                var snippet;
                while (match = regEx.exec(text)) {
                    snippet = text.slice(match.index - 50, match.index + 50);
                    printToScreen(fileName, path, snippet);
                }
            }
        }
        search.send();
    }

    function searchCourse(e) {
        e.preventDefault();
        var searchString = $('#searchBox').val();
        if (searchString === '') {
            return;
        }
        var file;
        $('#results').html('');
        for (file in files) {
            searchFile(files[file], searchString, file);
        }
    }

    function printAllLinks() {
        var link;
        var i;
        $('#results').html('');
        for (link in links) {
            for (i = 0; i < links[link].links.length; i++) {
                printToScreen(link, links[link].path, links[link].links[i]);
            }
        }
    }

    function searchPageAsString(htmlString, topic) {
        var regEx = new RegExp('<a', 'g');
        var match;
        var subString;
        var href;
        var start;
        var end;
        var fileName;
        var filePath;
        while (match = regEx.exec(htmlString)) {
            start = match.index;
            // Slice off everything before the link tag
            subString = htmlString.slice(start);
            end = subString.indexOf('</a>') + 4;
            // Store link tag
            subString = subString.slice(0, end).replace(/\n/g, "");
            if (!links[topic.Title]) {
                links[topic.Title] = {
                    path: topic.Url,
                    links: [],
                    topicId: topic.TopicId
                };
            }
            links[topic.Title].links.push(subString);
            // Store opening link tag
            end = subString.indexOf('>');
            subString = subString.slice(0, end);
            // Get href value
            if (subString.indexOf('href=' != -1) && subString.indexOf('.html') != -1) {
                start = subString.indexOf('href') + 6;
                end = subString.indexOf('.html') + 5;
                href = subString.slice(start, end);
                // Build filepath to file being linked to. 
                if (href.indexOf('/content/enforced/') === -1) {
                    end = topic.Url.indexOf(topic.Title);
                    filePath = topic.Url.slice(0, end) + href;
                } else {
                    filePath = href;
                }
                // Extract name of file
                if (href.indexOf('/') != -1) {
                    href = href.split('/');
                    fileName = href.pop();
                } else {
                    fileName = href;
                }
                fileName = fileName.replace('.html', '');
                // Save file and path to link object if not already there
                if (!files[fileName]) {
                    files[fileName] = filePath;
                }
            }
        }
    }

    function searchPageAsDocument(htmlString, file) {
        $(htmlString).find('a').each(function (index) {
            var el = $(this);
            var elAsString = $('<div />').html(el).html();
            var href = el.attr('href');
            var newFileTitle;
            // Store link tag
            if (!links[file.Title]) {
                links[file.Title] = {
                    path: file.Url,
                    links: [],
                    topicId: file.TopicId
                };
            }
            links[file.Title].links.push(elAsString);
            // If link goes to content page make sure it is listed in files object
            if (href && href.indexOf('.html') != -1) {
                if (href.indexOf('/') != -1) {
                    newFileTitle = href.split('/');
                    newFileTitle = newFileTitle[newFileTitle.length - 1];
                } else {
                    newFileTitle = href;
                }
                newFileTitle = newFileTitle.slice(0, newFileTitle.indexOf('.html'));
                if (!files[newFileTitle]) {
                    if (href.indexOf('/content/enforced') === -1) {
                        href = file.Url.slice(0, file.Url.indexOf(file.Title)) + href;
                    }
                    files[newFileTitle] = {
                        Title: newFileTitle,
                        TypeIdentifier: "File",
                        Url: href
                    }
                    // Search this new file for additional linked files
//                    searchForAdditionalFiles(files[newFileTitle]);
                }
            }
        });
    }

    function searchForAdditionalFiles(file) {
        if (file.TypeIdentifier != 'File') {
            return;
        }
        var url = "https://byui.brightspace.com" + file.Url;
        console.log(url);
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.onreadystatechange = function () {
            if (xhr.status === 404) { console.log('404: ' + url) }
            if (xhr.readyState == XMLHttpRequest.DONE && xhr.status === 200) {
                //        searchPageAsString(xhr.responseText, topic);
                searchPageAsDocument(xhr.responseText, file);
            }
        }
        xhr.send();
    }

    function processFile(file) {
        if (!files[file.Title]) {
            files[file.Title] = file;
        }
    }

    function processModule(module) {
        module.Topics.map(processFile);
        module.Modules.map(processModule);
    }

    // Uses Valince API to get table of contents of coures and then creates an object reprenting all the content page files linked to in the course.
    function init() {
        var xhr = new XMLHttpRequest();
        var orgUnit = window.location.search.split('&').find(function (string) {
            return string.indexOf('ou=') != -1;
        });
        orgUnit = orgUnit.slice(3);
        var children = "/d2l/api/le/1.5/" + orgUnit + "/content/toc";
        xhr.open("GET", children);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                // toc is array of objects representing a module. It contains files and any submodules
                var toc = JSON.parse(xhr.responseText).Modules;
                // Extract from each module it's files and files from any sub modules
                toc.map(processModule);
                console.log(files);
                for (var file in files) {
                    searchForAdditionalFiles(files[file]);
                };
            }
        }
        xhr.send();

        // Set event listeners
        $('#searchCourse button').on('click', searchCourse);
        $('#showAllLinksBtn').on('click', printAllLinks);
    }

    init();

}());