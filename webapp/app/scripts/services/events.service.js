'use strict';

/**
 * @ngdoc function
 * @name 360givingApp.service: Events
 * @description
 * # Events
 * Service of the 360givingApp
 */
angular.module('360givingApp')
  .service('Events', function () {
    var events = [
      'DATA_LOADED',
      'TOPIC_SELECTED',
      'TOPIC_DESELECTED'
    ];
    return _.merge(
      _.zipObject(
        events, //keys
        events  //values
      ),
      _.zipObject(
        [ 'VEGA_MOUSEOVER', 'VEGA_CLICK', 'VEGA_KEYDOWN', 'VEGA_TOUCHSTART'],
        [ 'mouseover', 'click', 'keydown', 'touchstart']
      )      
    );
  });
