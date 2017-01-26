/*jslint browser: true*/
/*global $, singleCourseSearch*/
var singleCourseTemplate = (function () {
    'use strict';

    var mainTemplate =
        `<div id="header">
                <img src="https://content.byui.edu/integ/gen/be2c7d0f-ed5e-4dca-ac0b-0b2a7155a4f2/0/smallBanner.jpg" alt="Course Banner" />
            </div>
            <div id="article">
                <h1>Course Search</h1>

                <p>NOTE: Course search is only able to search content pages that are directly or <span class="popup">indirectly<span>An example of an indirectly linked course page is one that doesn't appear directly in the table of contents but is linked to from a page that is in the table of contents.</span></span> linked to from the course table of contents. This means that any content pages that exist in the manage files that isn't ever linked to will not be searched. Also, the check for broken links feature is only able to check if links to other D2L files is working but can't check links to external resources.</p>

                <div id="content">

                    <form id="searchCourse">
                        <input id="searchBox" type="text" placeholder="Search..." />
                        <button id="btnGo" type="submit">&nbsp;</button>
                        <br>
                        <input id="caseSensitive" type="checkbox">
                        <label>Case Sensitive</label>
                        <input id="includeHTML" type="checkbox">
                        <label>Include HTML</label>
                        <input id="regex" type="checkbox">
                        <label>JavaScript RegEx</label>
                        <div class="tools">
                            <button id="refreshSnapshot" type="button">Refresh Snapshot</button>
                            <button id="checkLinks" type="button">Check Links</button>
                            <a id="saveResults" class="disabled" download="Course Search results.csv">Download Results</a>
                        </div>
                    </form>

                    <h4 id="printMessage"></h4>

                    <ul id="results"></ul>

                </div>

            </div>`;

    function buildListItem(file, id, href, path) {
        return `<li id="${id}">
                    <a href="javascript:void(0)" class="dismiss"></a>
                    <a href="${href}" target="_blank">${file}</a>
                    <span class="path">${path}</span>
                </li>`;
    }

    function buildSnippet(snippet) {
        return `<p>${snippet}<a href="javascript:void(0)" class="dismiss"></a></p>`;
    }

    return {
        mainTemplate: mainTemplate,
        buildListItem: buildListItem,
        buildSnippet: buildSnippet
    }
}());
