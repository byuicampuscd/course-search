var courseSearch = (function () {
    "use strict";
    var files = {};
    var orgUnit;

    function printToScreen(file, snippet, asHTML) {
        var id = file.replace(' ', ''),
            snippetEl = document.createElement('p');

        // Insert snippet
        snippetEl.innerHTML = snippet;

        if (!document.getElementById(id)) {
            var liEl = document.createElement('li');
            var linkEl = document.createElement('a');
            var pathEl = document.createElement('span');

            if (files[file].Identifier) {
                linkEl.href = 'https://byui.brightspace.com/d2l/le/content/' + orgUnit + '/contentfile/' + files[file].Identifier + '/EditFile?fm=0';
            } else {
                linkEl.href = files[file].Url;
            }
            linkEl.innerHTML = file;
            linkEl.target = '_blank';

            pathEl.innerHTML = files[file].Url;
            pathEl.className = 'path';

            liEl.id = id;
            liEl.append(linkEl);
            liEl.append(pathEl);
            liEl.append(snippetEl);

            $('#results').append(liEl);
        } else {
            document.getElementById(id).append(snippetEl);
        }

    }

    function escapeHTML(string) {
        return string.replace(/\</g, "&lt;").replace(/\>/g, "&gt;");
    }

    function highlight(snippet, match) {
        var temp, startIndex, endIndex;

        //Escape HTML tags
        match = escapeHTML(match);
        snippet = escapeHTML(snippet);

        // Insert highlight span
        startIndex = snippet.indexOf(match);
        endIndex = startIndex + match.length;
        temp = snippet.slice(startIndex, endIndex);
        temp = '<span class="highlight">' + temp + '</span>';
        return snippet.slice(0, startIndex) + temp + snippet.slice(endIndex);
    }

    function normalSearch(searchString) {
        var file, originalText, text, matchStart, matchEnd, snippetStart, snippetEnd, match,
            snippet,
            isCaseSensitive = $('#caseSensitive').prop('checked'),
            includeHTML = $('#includeHTML').prop('checked');

        // Clear old search results
        $('#results').html('');

        // Execute search
        for (file in files) {
            console.log('ran');
            if (!files[file].document) {
                console.log('Missing Document');
                console.log(files[file]);
            } else {
                if (includeHTML) {
                    originalText = $(files[file].document).find('html').html();
                } else {
                    originalText = $(files[file].document).find('body').text();
                }

                originalText = originalText.replace(/\n/g, " ");
                originalText = originalText.replace(/\s+/g, " ").trim();
                if (isCaseSensitive) {
                    text = originalText;
                } else {
                    text = originalText.toLowerCase();
                    searchString = searchString.toLowerCase();
                }
                matchEnd = 0;
                while (text.indexOf(searchString, matchEnd) != -1) {
                    matchStart = text.indexOf(searchString, matchEnd);
                    matchEnd = matchStart + searchString.length;
                    match = originalText.slice(matchStart, matchEnd);
                    snippetStart = (matchStart < 50) ? 0 : matchStart - 50;
                    snippetEnd = (snippetStart + 100 > text.length) ? text.length : snippetStart + 100;
                    snippet = originalText.slice(snippetStart, snippetEnd);
                    snippet = highlight(snippet, match);
                    printToScreen(file, snippet);
                }
            }
        }
    }

    function regExSearch(searchString) {
        var pattern, flags, file, text, regEx, match, snippetStart, snippetEnd, snippet,
            includeHTML = $('#includeHTML').prop('checked');

        // Check to make sure searchString is in regular expression form
        if (/^\/.+(\/[gimy]*)$/.test(searchString)) {
            pattern = searchString.slice(1, searchString.lastIndexOf('/'));
            flags = searchString.slice(searchString.lastIndexOf('/') + 1);
        } else {
            window.alert("Regular expression pattern must be wrapped with '/' and must only be followed by valid flags.");
            return;
        }

        // Clear old search results
        $('#results').html('');

        // Execute Search
        for (file in files) {
            if (includeHTML) {
                text = $(files[file].document).find('html').html();
            } else {
                text = $(files[file].document).find('body').text();
            }
            text = text.replace(/\n/g, " ");
            text = text.replace(/\s+/g, " ").trim();
            regEx = new RegExp(pattern, flags);
            while ((match = regEx.exec(text)) !== null) {
                snippetStart = (match.index < 50) ? 0 : match.index - 50;
                snippetEnd = (snippetStart + 100 > text.length) ? text.length : snippetStart + 100;
                snippet = text.slice(snippetStart, snippetEnd);
                snippet = highlight(snippet, match[0]);
                printToScreen(file, snippet);
                // If regex is global the while loop needs to continue, otherwise break to prevent an infinite loop.
                if (!regEx.global) {
                    break;
                }
            }
        }
    }

    function searchCourse(e) {
        e.preventDefault();
        var searchString = $('#searchBox').val();

        // Return if search box is empty
        if (searchString === '') {
            return;
        }
        
        // Determine type of search to execute
        if ($('#regex').prop('checked')) {
            regExSearch(searchString);
        } else {
            normalSearch(searchString);
        }
        
        // If no results were produced print message
        if ($('#results').html() === '') {
            $('#results').html('No Results Found');
        }
    }

    function printAllLinks() {
        var file;
        var links;
        var i;
        $('#results').html('');
        for (file in files) {
            links = files[file].links;
            for (i = 0; i < links.length; i++) {
                printToScreen(file, escapeHTML(links[i]));
            }
        }
    }
    
    function checkProgress() {
        for (var file in files) {
            if (!files[file].scanned) {
                return;
            }
        }
        $('#loadingMessage').hide();
        $('#searchCourse, #results').show();
    }

    function searchLinksForAdditionalFiles(file) {
        if (!files[file].links) {
            files[file].links = [];
        }
        $(files[file].document).find('a').each(function (index) {
            var el = $(this).clone();
            var elAsString = $('<div />').html(el).html();
            var href = decodeURI(el.attr('href'));
            var newFileTitle;
            var test = href;
            // Store link tag
            files[file].links.push(elAsString);
            // If link goes to content page make sure it is listed in files object
            if (href && href.slice(-4) === 'html' && href.slice(0, 4) != 'http') {
                if (href.indexOf('/') != -1) {
                    newFileTitle = href.split('/').pop();
                } else {
                    newFileTitle = href;
                }
                newFileTitle = newFileTitle.slice(0, newFileTitle.indexOf('.html'));
                if (!files[newFileTitle]) {
                    if (href.indexOf('/content/enforced') === -1) {
                        href = files[file].Url.split('/').slice(0, -1).join('/').concat('/' + href);
                    }
                    files[newFileTitle] = {
                            Title: newFileTitle,
                            TypeIdentifier: "File",
                            Url: href,
                            LinkedFrom: files[file].Title,
                            scanned: false
                        }
                    // Search this new file for additional linked files
                    getFile(newFileTitle);
                }
            }
            
        });
        
        files[file].scanned = true;
        checkProgress();
    }

    function getFile(file) {
        if (files[file].document) {
            return;
        }
        var url = "https://byui.brightspace.com" + files[file].Url;
        var xhr = new XMLHttpRequest();
        xhr.responseType = 'document';
        xhr.open("GET", url);
        xhr.onreadystatechange = function () {
            if (xhr.readyState == XMLHttpRequest.DONE && xhr.status === 200) {
                files[file].document = xhr.response;
                searchLinksForAdditionalFiles(file);
            } else if (xhr.readyState == XMLHttpRequest.DONE) {
                console.log('Parent File: ' + files[file].LinkedFrom);
                console.log('File: ' + decodeURI(files[file].Title));
                console.log('href: ' + files[file].Url);
                files[file].scanned = true;
                checkProgress();
            }
        }
        xhr.send();
    }

    function processFile(file) {
        if (!files[file.Title] && file.TypeIdentifier === 'File' && file.Url.slice(-4) === 'html') {
            files[file.Title] = file;
            files[file.Title].scanned = false;
        }
    }

    function processModule(module) {
        module.Topics.forEach(processFile);
        module.Modules.forEach(processModule);
    }

    // Uses Valince API to get table of contents of coures and then creates an object reprenting all the content page files linked to in the course.
    function init() {
        var xhr = new XMLHttpRequest();
        orgUnit = window.location.search.split('&').find(function (string) {
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
                toc.forEach(processModule);
                for (var file in files) {
                    getFile(file);
                };
            }
        }
        xhr.send();

        // Set event listeners
        $('#searchCourse button').on('click', searchCourse);
        $('#showAllLinksBtn').on('click', printAllLinks);
    }
    
    function printFiles() {
        console.log(files);
    }
    
    return {
        init: init,
        printFiles: printFiles
    };

}());