/*jslint browser: true */
/*global $ */

var search = (function () {
    'use strict';
    var links, results;

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

    function normalSearch(searchString, isCaseSensitive, includeHTML) {
        var link, originalText, text, matchStart, matchEnd, snippetStart, snippetEnd, match,
            snippet;

        // Execute search
        for (link in links) {
            if (links[link].document) {
                if (includeHTML) {
                    originalText = $(links[link].document).find('html').html();
                } else {
                    originalText = $(links[link].document).find('body').text();
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
                while (text.indexOf(searchString, matchEnd) !== -1) {
                    matchStart = text.indexOf(searchString, matchEnd);
                    matchEnd = matchStart + searchString.length;
                    match = originalText.slice(matchStart, matchEnd);
                    snippetStart = (matchStart < 50) ? 0 : matchStart - 50;
                    snippetEnd = (snippetStart + 100 > text.length) ? text.length : snippetStart + 100;
                    snippet = originalText.slice(snippetStart, snippetEnd);
                    snippet = highlight(snippet, match);
                    results.push({
                        title: links[link].title,
                        link: link,
                        snippet: snippet
                    });
                }
            }
        }
    }

    function regExSearch(searchString, includeHTML) {
        var pattern, flags, link, text, regEx, match, snippetStart, snippetEnd, snippet;

        // Check to make sure searchString is in regular expression form
        if (/^\/.+(\/[gimy]*)$/.test(searchString)) {
            pattern = searchString.slice(1, searchString.lastIndexOf('/'));
            flags = searchString.slice(searchString.lastIndexOf('/') + 1);
        } else {
            window.alert("Regular expression pattern must be wrapped with '/' and must only be followed by valid flags.");
            return;
        }
        try {
            // Create Regular Expression Object
            regEx = new RegExp(pattern, flags);
        } catch (ex) {
            window.alert(ex.message);
            return;
        }

        // Execute Search
        for (link in links) {
            if (links[link].document) {
                if (includeHTML) {
                    text = $(links[link].document).find('html').html();
                } else {
                    text = $(links[link].document).find('body').text();
                }
                text = text.replace(/\n/g, " ");
                text = text.replace(/\s+/g, " ").trim();
                while ((match = regEx.exec(text)) !== null) {
                    snippetStart = (match.index < 50) ? 0 : match.index - 50;
                    snippetEnd = (snippetStart + 100 > text.length) ? text.length : snippetStart + 100;
                    snippet = text.slice(snippetStart, snippetEnd);
                    snippet = highlight(snippet, match[0]);
                    results.push({
                        title: links[link].title,
                        link: link,
                        snippet: snippet
                    });
                    // If regex is global the while loop needs to continue, otherwise break to prevent an infinite loop.
                    if (!regEx.global) {
                        break;
                    }
                }
            }
        }
    }

    function search(searchString, snapshot, isCaseSensitive, includeHTML, isRegEx) {
        // Reset results
        results = [];

        // Save snapshot as links
        links = snapshot;

        if (isRegEx) {
            regExSearch(searchString, includeHTML);
        } else {
            normalSearch(searchString, isCaseSensitive, includeHTML);
        }

        return results;
    }

    return search;
}());

var courseSnapshot = (function () {
    'use strict';
    var links, complete, orgUnit;

    // Check progress of snapshot
    function checkProgress() {
        var link;

        for (link in links) {
            if (links[link].isD2L && links[link].isHTML && !links[link].checked) {
                return;
            }
        }

        // Execute callback
        complete(links);
    }

    // Search document for additional links
    function searchDocumentForAdditionalLinks(link) {
        var title, url, parentData;

        $(links[link].document).find('a').each(function (index) {
            try {
                url = decodeURI($(this).attr('href'));
            } catch (err) {
                url = $(this).attr('href');
            }

            //Set parent link data
            parentData = {
                title: links[link].title,
                link: link,
                snippet: $(this).text()
            };

            if (url.indexOf('/') !== -1) {
                title = url.split('/').pop();
            } else {
                title = url;
            }
            if (title.lastIndexOf('.') !== -1) {
                title = title.slice(0, title.lastIndexOf('.'));
            }

            processFile(title, url, parentData);
        });

        links[link].checked = true;
        checkProgress();
    }

    // Get File
    function getFile(link) {
        var url, xhr;

        // Check if link needs adjusting
        if (link.search(/^http/) === -1) {
            url = "https://byui.brightspace.com" + link;
        } else {
            url = link;
        }

        xhr = new XMLHttpRequest();
        xhr.responseType = 'document';
        xhr.open("GET", url);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    links[link].document = xhr.response;
                    links[link].isWorking = true;
                    searchDocumentForAdditionalLinks(link);
                } else {
                    links[link].checked = true;
                    links[link].isWorking = false;
                    checkProgress();
                }
            }
        };
        try {
            xhr.send();
        } catch (err) {
            console.error(err);
        }
    }

    // Process a file
    function processFile(title, url, parentData, identifier) {
        var isD2L = false,
            isHTML = false;

        // Make sure url is defined
        if (!url || url.search(/^(javascript|undefined|#)/) !== -1) {
            return;
        }

        // Check if file is directly linked to in the table of contents
        if (parentData.snippet.search(/^Module/) !== -1) {
            parentData.snippet = parentData.snippet + ' File: ' + title;
        }

        // Check if internal link
        if (url.search(/^http/) === -1) {
            isD2L = true;

            //If needed make URL absolute
            if (url.indexOf('quickLink') === -1 && url.indexOf('/content/enforced') === -1) {
                url = parentData.link.split('/').slice(0, -1).join('/').concat('/' + url);
            }
        }

        // Check if HTML file
        if (isD2L && url.slice(-4) === 'html') {
            isHTML = true;
        }

        // Check if already stored
        if (links[url]) {
            links[url].foundIn.push(parentData);
        } else {

            // Store in links object
            links[url] = {
                title: title,
                isD2L: isD2L,
                isHTML: isHTML,
                identifier: (identifier) ? identifier : false,
                checked: false,
                foundIn: [parentData]
            };

            // If able get the file
            if (isD2L && isHTML) {
                getFile(url);
            }
        }
    }

    // Process a module
    function processModule(module) {
        var parentData = {
            title: 'Course Table of Contents',
            link: 'https://byui.brightspace.com/d2l/le/content/' + orgUnit + '/Home',
            snippet: 'Module: ' + module.Title
        };
        module.Topics.forEach(function (file) {
            processFile(file.Title, file.Url, parentData, file.Identifier);
            // check progress here ??
        });
        module.Modules.forEach(processModule);
    }

    // Start building a snapshot of a course
    function build(ou, callback, errorCallback) {

        // Make orgUnit accessible
        orgUnit = ou;

        // Set callback
        complete = callback;

        // Reset links object
        links = {};

        // Get Course Table of Contents
        $.ajax({
            url: "/d2l/api/le/1.5/" + orgUnit + "/content/toc",
            success: function (data) {
                // Create object for table of contents
                links['https://byui.brightspace.com/d2l/le/content/' + orgUnit + '/Home'] = {
                    title: 'Course Table of Contents',
                    isD2L: true,
                    isHTML: false,
                    identifier: false,
                    checked: true,
                    isWorking: true,
                    foundIn: []
                };

                // Extract from each module it's files and files from any sub modules
                data.Modules.forEach(processModule);
                checkProgress();
            },
            error: function (err) {
                // Add Error Handling logic
                errorCallback(err);
            }
        });
    }

    // Expose needed functions
    return {
        build: build
    }
}());

var loader = (function () {
    'use strict';
    var loaderHTML =
        `<div id="loadingMessage">
            <div id="loader"></div>
            <p></p>
        </div>`;

    function updateMessage(message) {
        $('#loadingMessage p').html(message);
    }

    function deactivate() {
        $('#loadingMessage').hide();
        $('#content').show();
    }

    function activate() {
        if (!document.getElementById('loadingMessage')) {
            $('#article').append(loaderHTML);
        }
        $('#content').hide();
        $('#loadingMessage').show();
    }

    return {
        activate: activate,
        deactivate: deactivate,
        updateMessage: updateMessage
    }
}());
