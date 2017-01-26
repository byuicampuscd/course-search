/*jslint browser: true*/
/* eslint-env browser */
/* eslint no-console:0 no-unused-vars:1*/
/*global $, singleCourseTemplate, loader, search, courseSnapshot, d3*/
var singleCourseSearch = (function () {
    'use strict';
    var orgUnit, snapshot,
        numOfPrints = 0;

    function getSnapshot() {
        console.log(snapshot);
    }

    function dismiss(e) {
        $(e.target.parentElement).animate({
            height: '0',
            paddingTop: '0',
            paddingBottom: '0'
        }, 100, function () {
            $(this).hide();
        });
    }

    function reset(id) {
        numOfPrints = 0;
        document.getElementById(id).innerHTML = '';
    }

    function done(id, message) {
        var dismissLinks = document.querySelectorAll('.dismiss');
        // Update print count to screen
        document.getElementById(id).innerHTML = numOfPrints + ' ' + message;

        // Add listeners to dismiss links
        dismissLinks.forEach(function (link) {
            link.addEventListener('click', dismiss);
        });
    }

    function print(id, data, countAsPrint) {
        document.getElementById(id).insertAdjacentHTML('beforeend', data);
        if (countAsPrint) {
            numOfPrints += 1;
        }
    }

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
            print('results', singleCourseTemplate.buildListItem(snapshot[results.link].title, id, href, results.link));
        }

        // Insert snippet to correct list item
        print(id, singleCourseTemplate.buildSnippet(results.snippet), true);
    }

    function reportBrokenLinks() {
        var link;

        reset('results');

        for (link in snapshot) {
            if (snapshot[link].isD2L && !snapshot[link].isWorking) {
                snapshot[link].foundIn.forEach(prepareForPrint);
            }
        }

        done('printMessage', 'Broken Links Detected');
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

    function updateDownloadLink(results) {
        var resultsMod = results.map(function (result) {
            return {
                link: window.origin + result.link,
                match: result.snippet,
                title: result.title
            };


        });
        var csvList = d3.csvFormat(resultsMod, ['title', 'link', 'match']);
        document.getElementById('saveResults').href = "data:text/csv;charset=utf-8," + encodeURIComponent(csvList);
        document.getElementById('saveResults').classList.remove('disabled');
    }

    function resetDownloadLink() {
        document.getElementById('saveResults').removeAttribute('href');
        document.getElementById('saveResults').classList.add('disabled');
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

        // Run search
        results = search(searchString, snapshot, isCaseSensitive, includeHMTL, isRegEx);

        reset('results');

        if (results.length > 0) {
            results.forEach(prepareForPrint);
            updateDownloadLink(results);
        } else {
            resetDownloadLink();
        }
        done('printMessage', 'Results');
    }

    function processSnapshot(data) {
        // Store snapshot
        snapshot = data;

        loader.deactivate();
    }

    function requestSnapshot() {
        // Clear results
        $('#results').html('');
        $('#printMessage').html('');

        // Activate loader and update message
        loader.activate();
        loader.updateMessage('Building Snapshot: Gathering Content Pages...');

        // Start the build and pass processSnapshot as callback
        courseSnapshot.build(orgUnit, processSnapshot);
    }

    function init() {
        // Inject HTML
        $('#main').html(singleCourseTemplate.mainTemplate);

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
        init: init,
        getSnapshot: getSnapshot
    };
}());
