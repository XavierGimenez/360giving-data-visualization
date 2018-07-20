'use strict';

/**
 * @ngdoc function
 * @name 360givingApp.directive:swarmplot
 * @description
 * # swarmplot
 * Controller of the 360givingApp
 */
angular.module('360givingApp')
  .directive('swarmplot', function ($rootScope, Events) {
    return {
        restrict: 'E',
        template:   '<div id="{{DOM_ID}}"></div>',
        scope : {
        },
        link: function postLink($scope, element) {
            $rootScope.$on(Events.TOPIC_SELECTED, function(event, eventData) {
                console.log("evnet received");
            });
        }
    }
  });