var courseSearch = (function () {
    "use strict";
    var orgUnit, files, changeMessageInterval, currentMessageIndex,
        firstPageLoad = true,
        messages = [
            'Start Building Snapshot...',
            'Gathering Course Files...',
            'Checking for Broken Links...'
        ];

    function printToScreen(insertInto, file, snippet) {
        var href,
            id = file.replace(/\s/g, '');
        
        if (insertInto === 'results') {
            id = 'result-' + id;
        } else if (insertInto === 'brokenLinks') {
            id = 'broken-' + id;
        }

        if (!document.getElementById(id)) {

            if (files[file].Identifier) {
                href = 'https://byui.brightspace.com/d2l/le/content/' + orgUnit + '/contentfile/' + files[file].Identifier + '/EditFile?fm=0';
            } else {
                href = files[file].Url;
            }

            document.getElementById(insertInto).insertAdjacentHTML('beforeend', buildListItem(files[file].Title, id, href, files[file].Url));
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
        var file, originalText, text, matchStart, matchEnd, snippetStart, snippetEnd, match,
            snippet,
            isCaseSensitive = $('#caseSensitive').prop('checked'),
            includeHTML = $('#includeHTML').prop('checked');

        // Clear old search results
        $('#results').html('');

        // Execute search
        for (file in files) {
            if (files[file].document) {
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
                while (text.indexOf(searchString, matchEnd) !== -1) {
                    matchStart = text.indexOf(searchString, matchEnd);
                    matchEnd = matchStart + searchString.length;
                    match = originalText.slice(matchStart, matchEnd);
                    snippetStart = (matchStart < 50) ? 0 : matchStart - 50;
                    snippetEnd = (snippetStart + 100 > text.length) ? text.length : snippetStart + 100;
                    snippet = originalText.slice(snippetStart, snippetEnd);
                    snippet = highlight(snippet, match);
                    printToScreen('results', file, snippet);
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
                printToScreen('results', file, snippet);
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
        var file,
            brokenLinkCount = 0,
            brokenLinks = [];
        
        for (file in files) {
            if (!files[file].isWorking) {
                printToScreen('brokenLinks', files[file].foundIn[0].url, 'Link: ' + files[file].foundIn[0].text);
                brokenLinkCount += files[file].foundIn.length;
                brokenLinks.push(files[file]);
            }
        }
        
        if (brokenLinkCount > 0) {
            if (firstPageLoad) {
                $('#hideBrokenLinks, #showBrokenLinks').on('click', function() {
                    $('#brokenLinks, #hideBrokenLinks, #showBrokenLinks').toggle();
                });
            }
            $('#brokenLinks, #hideBrokenLinks').show();
        }
    }

    function checkProgress() {
        var file;
        for (file in files) {
            if (!files[file].checked) {
                return;
            }
        }
        reportBrokenLinks();
        $('#main').css('min-height', 'initial');
        $('#loadingMessage').hide();
        $('#searchCourse, #results').show();
        firstPageLoad = false;
    }

    function checkLink(file) {
        $.ajax({
            type: 'HEAD',
            url: 'https://byui.brightspace.com' + file,
            success: function () {
                files[file].checked = true;
                files[file].isWorking = true;
                checkProgress();
            },
            error: function (data) {
                // page does not exist
                files[file].checked = true;
                files[file].isWorking = false;
                checkProgress();
            }
        });
    }

    function searchLinksForAdditionalFiles(file) {
        var href, newFileTitle, parentData, checked, isD2L, isHTML;

        $(files[file].document).find('a').each(function (index) {
            checked = true;
            isD2L = false;
            isHTML = false;
            href = decodeURI($(this).attr('href'));

            //Set parent file data
            parentData = {
                url: file,
                text: $(this).text()
            };

            if (href.indexOf('/') != -1) {
                newFileTitle = href.split('/').pop();
            } else {
                newFileTitle = href;
            }

            //Check if link is for a D2L resource
            if (href && href.slice(0, 1) === '/') {
                isD2L = true;
                checked = false;

                //Check if html file
                if (href.slice(-4) === 'html') {
                    isHTML = true;
                } else {
//                    console.log(href);
                }

                //If needed make URL absolute
                if (href.indexOf('quickLink') === -1 && href.indexOf('/content/enforced') === -1) {
                    href = files[file].Url.split('/').slice(0, -1).join('/').concat('/' + href);
                }
            }

            //Store in files object
            if (!files[href]) {
                files[href] = {
                    Title: newFileTitle,
                    Url: href,
                    isD2L: isD2L,
                    isHTML: isHTML,
                    checked: checked,
                    foundIn: [parentData]
                };
            } else {
                files[href].foundIn.push(parentData);
            }

            //If needed check link or getFile
            if (!files[href].checked && files[href].isD2L) {
                if (files[href].isHTML) {
                    getFile(href);
                } else {
                    checkLink(href);
                }
            } else {
                files[href].isWorking = true;
            }
        });

        files[file].checked = true;
        checkProgress();
    }

    function getFile(file) {
        var url, xhr;

        url = "https://byui.brightspace.com" + file;

        xhr = new XMLHttpRequest();
        xhr.responseType = 'document';
        xhr.open("GET", url);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    files[file].document = xhr.response;
                    files[file].isWorking = true;
                    searchLinksForAdditionalFiles(file);
                } else {
                    // What if a broken link is used in multiple files?
                    files[file].checked = true;
                    files[file].isWorking = false;
                    checkProgress();
                }
            }
        }
        xhr.send();
    }

    function processFile(file) {
        var isD2L = false,
            isHTML = false;

        if (files[file.Url]) {
            return;
        }

        // Check if internal link
        if (file.Url.slice(0, 1) === '/') {
            isD2L = true;
        }

        // Check if HTML file
        if (isD2L && file.Url.slice(-4) === 'html') {
            isHTML = true;
        }

        files[file.Url] = file;
        files[file.Url].isD2L = isD2L;
        files[file.Url].isHTML = isHTML;
        files[file.Url].checked = false;
        files[file.Url].foundIn = [{
            url: false,
            text: 'Course Table of Contents'
        }]
    }

    function processModule(module) {
        module.Topics.forEach(processFile);
        module.Modules.forEach(processModule);
    }
    
    function changeMessage() {
        currentMessageIndex++;
        $('#loadingMessage p').html(messages[currentMessageIndex]);
        
        if (currentMessageIndex + 1 === messages.length) {
            clearInterval(changeMessageInterval);
        }
    }
    
    function startLoader() {
        $('#main').css('min-height', '');
        currentMessageIndex = 0;
        $('#loadingMessage p').html(messages[currentMessageIndex]);
        $('#loadingMessage').show();
        changeMessageInterval = window.setInterval(changeMessage, 3000);
    }

    // Uses Valince API to get table of contents of coures and then creates an object reprenting all the content page files linked to in the course.
    function init() {
        var children, toc, file,
            xhr = new XMLHttpRequest();
        
        files = {};
        $('#results, #brokenLinks').html('');
        
        // Hide everything but loader
        $('#searchCourse, #brokenLinks, #hideBrokenLinks, #showBrokenLinks, #results').hide();
        startLoader();
        
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
                for (file in files) {
                    if (files[file].isD2L && files[file].isHTML) {
                        getFile(file);
                    } else if (files[file].isD2L) {
                        checkLink(file);
                    } else {
                        files[file].checked = true;
                        files[file].isWorking = true;
                    }
                };
            }
        }
        xhr.send();

        // Set event listeners
        if (firstPageLoad) {
            $('#searchCourse button').on('click', searchCourse);
        }
    }

    function printFiles() {        
        console.log(files);
    }

    return {
        init: init,
        printFiles: printFiles
    };

}());