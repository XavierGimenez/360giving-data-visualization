'use strict';

/**
 * @ngdoc function
 * @name 360givingApp.directive:keywords
 * @description
 * # keywords
 * Controller of the 360givingApp
 */
angular.module('360givingApp')
  .directive('keywords', function (Events, VegaService, MasterData) {
    return {
        restrict: 'E',
        template:   '<div id="{{DOM_ID}}"></div>',
        scope : {
            topic: '@'
        },
        link: function postLink($scope, element) {

            $scope.DOM_ID = _.uniqueId('keywords');

            $scope.$on(Events.DATA_LOADED, function() {
                vega.loader()
                    .load('./vega-specs/keywords.vegaspec.json')
                    .then(render);
            });
            

            function render(response) {
                var vega_spec = JSON.parse(response);
                vega_spec.width = element.innerWidth();
                vega_spec.height = window.innerHeight / 2;
                vega_spec.marks[0].transform[0].size = [vega_spec.width, vega_spec.height];
                _.find(
                    vega_spec.data, 
                    ['name', 'table']
                ).values = _.map(
                    MasterData.topics['topic' + $scope.topic],
                    function(arr) {
                        return {
                            text : arr[0],
                            count : arr[1]
                        };
                    }
                )
                
                // add formula to increase the text weight for those values
                // over the third quartile of values
                var quartiles = dl.quartile(
                    _.find(vega_spec.data, ['name', 'table']).values, 
                    function(keyword) { 
                        return keyword.count; 
                    }
                );

                _.find(vega_spec.data, ['name', 'table']).transform.push({
                    "type": "formula", "as": "weight",
                    "expr": "if(datum.weight >=" + _.last(quartiles)+ ", 600, 300)"
                });

                VegaService.view(
                    vega_spec, 
                    $scope.DOM_ID
                );
            }
        }
    }
  });