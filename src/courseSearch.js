/*jslint browser: true*/
/*global $, singleCourseTemplate, printer, loader, search, courseSnapshot*/
var courseSearch = (function () {
    'use strict';
    var snapshot, currentCourse, currentSearch,
        coursesFailed = [],
        html = '',
        finalResults = {};
    
    function saveFinalResults() {
        saveFile(finalResults, 'Final Results');
    }
    
    function getFinalResults() {
        return finalResults;
    }
    
    function saveFile(data, fileName) {
        var textToWrite = JSON.stringify(data),
            textFileAsBlob = new Blob([textToWrite], {
                type: 'text/json'
            }),
            fileNameToSaveAs = fileName + '.json',
            downloadLink = document.createElement("a");

        downloadLink.download = fileNameToSaveAs;
        downloadLink.innerHTML = "Download File";

        if (window.URL !== null) {
            // Chrome allows the link to be clicked
            // without actually adding it to the DOM.
            downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
        } else {
            // Firefox requires the link to be added to the DOM
            // before it can be clicked.
            downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
        }

        downloadLink.click();
    }
    
    function openDropDown(text) {
        html += '<div class="drop-down">' + text + '</div>';
        html += '<div class="drop-content">';
    }
    
    function openTable(headings) {
        html += '<table><tr>';
        headings.forEach(function(heading) {
            html += '<th>' + heading + '</th>';
        });
        html += '<tr>';
    }
    
    function insertOverviewRow(cells) {
        html += '<tr>';
        cells.forEach(function (cell) {
            html += '<td>' + cell + '</td>';
        });
        html += '</tr>';
    }
    
    function insertLink(file) {
        html += '<a href="' + file.link + '" target="_blank">' + file.title + '</a> ';
    }
    
    function insertRow(cell1, cell2) {
        html += '<tr>';
        html += '<td>' + cell1 + '</td><td>';
        cell2.forEach(insertLink);
        html += '</td></tr>';
    }
    
    function searchComplete() {
        var feature, course;
        // Print Overview Table
        $('#start').hide();
        html += '<h2>Results Overview</h2>';
        openTable(['Web Feature', '# of Courses Used In']);
        for (feature in finalResults) {
            insertOverviewRow([feature, Object.keys(finalResults[feature]).length]);
        }
        html += '</table>';
        html += '<h2>Feature Specific Results</h2>';
        
        // Print table for each feature
        for (feature in finalResults) {
            if (Object.keys(finalResults[feature]).length > 0) {
                openDropDown(feature);
                openTable(['Course', 'Pages']);
                for (course in finalResults[feature]) {
                    insertRow(course, finalResults[feature][course]);
                }
                html += '</table>';
                html += '</div>';
            }
        }
        
        // Print errors
        openDropDown('Failed Courses');
        openTable(['Course', 'Error']);
        coursesFailed.forEach(function (fail) {
            insertOverviewRow([fail.course, fail.error.status + ': ' + fail.error.statusText]);
        });
        html += '</div>';
        
        document.getElementById('article').insertAdjacentHTML('beforeend', html);
        webFeatures.initDropDowns();
        loader.deactivate();
    }
    
    function deleteSnippet(obj) {
        delete obj.snippet;
    }
    
    function searchCourse (searchData) {
        var results;
        
        currentSearch = searchData;
        
        // Search takes: searchTerm, snapshot, isCaseSensitive, includeHTML, isRegEx
        results = search(searchData.regex, snapshot, false, true, true);
        
        // Store results if any
        if (results.length > 0) {
            results.forEach(deleteSnippet);
            finalResults[currentSearch.name][currentCourse.course] = results;
        }
    }

    function processSnapshot(data) {
        // Store snapshot
        snapshot = data;
        searches.forEach(searchCourse);
        searchNextCourse();
    }
    
    function handleErrorGettingCourse(err) {
        currentCourse.error = err;
        coursesFailed.push(currentCourse);
        searchNextCourse();
    }
    
    function searchNextCourse () {
        if (courses.length > 0) {
            currentCourse = courses.shift();
            loader.updateMessage('Searching ' + currentCourse.course + ' (' + courses.length + ' remaining)');
            courseSnapshot.build(currentCourse.orgUnit, processSnapshot, handleErrorGettingCourse);
        } else {
            searchComplete();
        }
    }

    function init() {
        // Inject HTML
        $('#main').html(courseSearchTemplate.template);
        
        // Create all searches in finalResults object
        searches.forEach(function (data) {
            finalResults[data.name] = {};
        });

        // Set Handlers
        $('#start').on('click', function() {
            loader.activate();
            searchNextCourse();
        });
        
    }

    return {
        init: init,
        getFinalResults: getFinalResults,
        saveFinalResults: saveFinalResults
    };
}());