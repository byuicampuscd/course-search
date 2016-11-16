/*jslint browser: true*/
/*global $, singeCourseTemplate, printer, loader, search, courseSnapshot*/
var singleCourseSearch = (function () {
    'use strict';
    var orgUnit, snapshot;
    
    function prepareForPrint(results) {
        var href, html,
            id = results.link.replace(/\s/g, '');

        if (!document.getElementById(id)) {
            if (snapshot[results.link].identifier) {
                href = 'https://byui.brightspace.com/d2l/le/content/' + orgUnit + '/contentfile/' + snapshot[results.link].identifier + '/EditFile?fm=0';
            } else {
                href = results.link;
            }

            // Print new list item
            printer.print('results', singeCourseTemplate.buildListItem(snapshot[results.link].title, id, href, results.link));
        }

        // Insert snippet to correct list item
        printer.print(id, singeCourseTemplate.buildSnippet(results.snippet), true);
    }
    
    function reportBrokenLinks() {
        var link;
        
        printer.reset('results');

        for (link in snapshot) {
            if (snapshot[link].isD2L && !snapshot[link].isWorking) {
                
                snapshot[link].foundIn.forEach(function (data) {
                    prepareForPrint({
                        link: data.url,
                        snippet: data.text
                    });
                });
            }
        }
        
        printer.done('printMessage', 'Broken Links Detected');
        loader.deactivate();
    }
    
    function checkLinkProgress() {
        var link;
        
        for (link in snapshot) {
            if (snapshot[link].isD2L && !snapshot[link].checked) {
                return false;
            }
        }
        reportBrokenLinks();
        return true;
    }

    function checkLink(link) {
        $.ajax({
            type: 'HEAD',
            url: 'https://byui.brightspace.com' + link,
            success: function () {
                snapshot[link].checked = true;
                snapshot[link].isWorking = true;
                checkLinkProgress();
            },
            error: function (data) {
                // page does not exist
                snapshot[link].checked = true;
                snapshot[link].isWorking = false;
                checkLinkProgress();
            }
        });
    }

    function checkForBrokenLinks() {
        var link;
        
        loader.activate();
        loader.updateMessage('Checking for Broken D2L Links...');
        
        if (checkLinkProgress()) {
            return;
        }

        for (link in snapshot) {
            if (snapshot[link].isD2L && !snapshot[link].checked) {
                checkLink(link);
            }
        }
    }

    function searchCourse(e) {
        e.preventDefault();
        var results, isCaseSensitive, includeHMTL, isRegEx,
            searchString = $('#searchBox').val();

        // Return if search box is empty
        if (searchString === '') {
            return;
        }

        // Determine type of search to execute
        isCaseSensitive = $('#caseSensitive').prop('checked');
        includeHMTL = $('#includeHTML').prop('checked');
        isRegEx = $('#regex').prop('checked');

        results = search(searchString, snapshot, isCaseSensitive, includeHMTL, isRegEx);
        
        printer.reset('results');
        
        if (results.length > 0) {
            results.forEach(prepareForPrint);
        }
        
        printer.done('printMessage', 'Results');
    }

    function processSnapshot(data) {
        // Store snapshot
        snapshot = data;

        loader.deactivate();
    }

    function requestSnapshot() {
        // Clear screen except loader
        $('#results, #printMessage').html('');
        $('#main').css('min-height', '');

        // Activate loader and update message
        loader.activate();
        loader.updateMessage('Building Snapshot: Gathering Content Pages...');

        // Start the build
        courseSnapshot.build(orgUnit, processSnapshot);
    }

    function init() {
        // Inject HTML
        $('#main').html(singeCourseTemplate.template);
        
        // Pull orgUnit from iframe
        orgUnit = window.location.search.split('&').find(function (string) {
            return string.indexOf('ou=') !== -1;
        });
        orgUnit = orgUnit.slice(3);

        // Set Handlers
        $('#refreshSnapshot').on('click', requestSnapshot);
        $('#checkLinks').on('click', checkForBrokenLinks);
        $('#btnGo').on('click', searchCourse);
        $('#regex').on('change', function (e) {
            if ($('#regex').prop('checked')) {
                $('#caseSensitive').prop('disabled', true);
            } else {
                $('#caseSensitive').prop('disabled', false);
            }
        });

        requestSnapshot();
    }

    return {
        init: init
    };
}());