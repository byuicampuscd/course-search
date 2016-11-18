/*jslint browser: true*/
/*global $, singleCourseSearch*/
var courseSearchTemplate = (function () {
    'use strict';
    
    var template =
        `<div id="header">
                <img src="https://content.byui.edu/integ/gen/be2c7d0f-ed5e-4dca-ac0b-0b2a7155a4f2/0/smallBanner.jpg" alt="Course Banner" />
            </div>
            <div id="article">
                <h1>All Course Search</h1>

                <div id="content">
                    <button id="start" type="button">Start</button>
                </div>

            </div>`;
    
    return {
        template: template
    }
}());