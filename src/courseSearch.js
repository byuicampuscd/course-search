var courseSearch = (function () {
    "use strict";
    var orgUnit, links,
        firstPageLoad = true;

    function printToScreen(insertInto, link, snippet) {
        var href,
            id = link.replace(/\s/g, '');

        if (insertInto === 'results') {
            id = 'result-' + id;
        } else if (insertInto === 'brokenLinks') {
            id = 'broken-' + id;
        }

        if (!document.getElementById(id)) {

            if (links[link].identifier) {
                href = 'https://byui.brightspace.com/d2l/le/content/' + orgUnit + '/contentfile/' + links[link].identifier + '/EditFile?fm=0';
            } else {
                href = links[link].url;
            }

            document.getElementById(insertInto).insertAdjacentHTML('beforeend', buildListItem(links[link].title, id, href, link));
        }

        document.getElementById(id).insertAdjacentHTML('beforeend', buildSnippet(snippet));


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
        var link, originalText, text, matchStart, matchEnd, snippetStart, snippetEnd, match,
            snippet,
            isCaseSensitive = $('#caseSensitive').prop('checked'),
            includeHTML = $('#includeHTML').prop('checked');

        // Clear old search results
        $('#results').html('');

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
                    printToScreen('results', link, snippet);
                }
            }
        }
    }

    function regExSearch(searchString) {
        var pattern, flags, link, text, regEx, match, snippetStart, snippetEnd, snippet,
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
        for (link in links) {
            if (includeHTML) {
                text = $(links[link].document).find('html').html();
            } else {
                text = $(links[link].document).find('body').text();
            }
            text = text.replace(/\n/g, " ");
            text = text.replace(/\s+/g, " ").trim();
            regEx = new RegExp(pattern, flags);
            while ((match = regEx.exec(text)) !== null) {
                snippetStart = (match.index < 50) ? 0 : match.index - 50;
                snippetEnd = (snippetStart + 100 > text.length) ? text.length : snippetStart + 100;
                snippet = text.slice(snippetStart, snippetEnd);
                snippet = highlight(snippet, match[0]);
                printToScreen('results', link, snippet);
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

    function reportBrokenLinks() {
        var link,
            brokenLinkCount = 0,
            brokenLinks = [];

        for (link in links) {
            if (links[link].isD2L && !links[link].isWorking) {
                printToScreen('brokenLinks', links[link].foundIn[0].url, 'Link: ' +         links[link].foundIn[0].text);
                brokenLinkCount += links[link].foundIn.length;
                brokenLinks.push(links[link]); 
            }
        }
        
        console.log('Broken Links: ' + brokenLinkCount);

        if (brokenLinkCount > 0) {
            if (firstPageLoad) {
                $('#hideBrokenLinks, #showBrokenLinks').on('click', function () {
                    $('#brokenLinks, #hideBrokenLinks, #showBrokenLinks').toggle();
                });
            }
            $('#brokenLinks, #hideBrokenLinks').show();
        }
    }
    
    function checkLinkProgress() {
        var link;
        
        for (link in links) {
            if (links[link].isD2L && !links[link].checked) {
                return;
            }
        }
        reportBrokenLinks();
        $('#main').css('min-height', 'initial');
        $('#loadingMessage').hide();
        $('#searchCourse, #results').show();
        firstPageLoad = false;
    }

    function checkLink(link) {
        $.ajax({
            type: 'HEAD',
            url: 'https://byui.brightspace.com' + link,
            success: function () {
                links[link].checked = true;
                links[link].isWorking = true;
                checkLinkProgress();
            },
            error: function (data) {
                // page does not exist
                links[link].checked = true;
                links[link].isWorking = false;
                checkLinkProgress();
            }
        });
    }

    function checkProgress() {
        var link;
        
        for (link in links) {
            if (links[link].isD2L && links[link].isHTML && !links[link].checked) {
                return;
            }
        }
        $('#loadingMessage p').html('Checking for Broken Links...');
        // Check D2L links
        for (link in links) {
            if (links[link].isD2L && !links[link].checked) {
                checkLink(link);
            }
        }
    }

    function searchDocumentForAdditionalLinks(link) {
        var title, url, parentData;

        $(links[link].document).find('a').each(function (index) {
            url = decodeURI($(this).attr('href'));

            //Set parent link data
            parentData = {
                url: link,
                text: $(this).text()
            };

            if (url.indexOf('/') != -1) {
                title = url.split('/').pop();
            } else {
                title = url;
            }

            processFile(title, url, parentData);
        });

        links[link].checked = true;
        checkProgress();
    }

    function getFile(link) {
        var url, xhr;

        url = "https://byui.brightspace.com" + link;

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
        }
        xhr.send();
    }

    function processFile(title, url, parentData, identifier) {
        var isD2L = false,
            isHTML = false;
        
        // Make sure url is defined
        if (!url || url.search(/^(javascript|undefined)/) !== -1) {
            return;
        }
        
        // Check if internal link
        if (url.search(/^http/) === -1) {
            isD2L = true;
            
            //If needed make URL absolute
            if (url.indexOf('quickLink') === -1 && url.indexOf('/content/enforced') === -1) {
                url = parentData.url.split('/').slice(0, -1).join('/').concat('/' + url);
            }
        }

        // Check if HTML file
        if (isD2L && url.slice(-4) === 'html') {
            isHTML = true;
        }

        // Check if already stored
        if (links[url]) {
            if (parentData.text !== 'Course Table of Contents') {
                links[url].foundIn.push(parentData);
            }
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

    function processModule(module) {
        var parentData = {
            url: 'Table of Contents',
            text: 'Course Table of Contents'
        };
        module.Topics.forEach(function (file) {
            processFile(file.Title, file.Url, parentData, file.Identifier);
        });
        module.Modules.forEach(processModule);
    }

    // Uses Valince API to get table of contents of coures and then creates an object reprenting all the content page files linked to in the course.
    function init() {
        var children, toc, link,
            xhr = new XMLHttpRequest();

        links = {};
        $('#results, #brokenLinks').html('');

        // Hide everything but loader
        $('#searchCourse, #brokenLinks, #hideBrokenLinks, #showBrokenLinks, #results').hide();
        $('#main').css('min-height', '');
        $('#loadingMessage p').html('Building Snapshot: Gathering Files...');
        $('#loadingMessage').show();

        orgUnit = window.location.search.split('&').find(function (string) {
            return string.indexOf('ou=') != -1;
        });
        orgUnit = orgUnit.slice(3);
        children = "/d2l/api/le/1.5/" + orgUnit + "/content/toc";
        xhr.open("GET", children);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                // toc is array of objects representing a module. It contains files and any submodules
                toc = JSON.parse(xhr.responseText).Modules;
                // Extract from each module it's files and files from any sub modules
                toc.forEach(processModule);
            }
        }
        xhr.send();

        // Set event listeners
        if (firstPageLoad) {
            $('#searchCourse button').on('click', searchCourse);
        }
    }

    function printLinks() {
        console.log(links);
    }

    return {
        init: init,
        printLinks: printLinks
    };

}());