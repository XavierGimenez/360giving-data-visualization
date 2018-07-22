'use strict';

/**
 * @ngdoc function
 * @name 360givingApp.directive:bubbletimeline
 * @description
 * # bubbletimeline
 * Controller of the 360givingApp
 */
angular.module('360givingApp')
  .directive('bubbletimeline', function ($rootScope, Events) {
    return {
        restrict: 'E',
        template:   '<div id="{{DOM_ID}}"></div>',
        scope : {
        },
        link: function postLink($scope) {
            var x,
                y,
                r;

            $scope.render = render;

            $rootScope.$on(Events.TOPIC_SELECTED, function(event, eventData) {
                d3.csv('data/agg_' + eventData.topicId + '_fundingOrgYearly.csv', function(error, data) {
                    data.forEach(function(d) {
                        d.Date = new Date(+d.Date, 0, 1)
                        d['DocumentWeight'] = +d['DocumentWeight'];
                        d['Amount Awarded'] = +d['Amount Awarded'];
                        d['Identifier']     = +d['Identifier'];
                    });
                    render(data, eventData);
                });
            });



            function render(data, eventData) {
                x = d3.scaleTime()
                    .domain(d3.extent(data, function(d) { 
                        return d.Date; 
                    }))
                    .range([0, eventData.width]);
                y = d3.scaleBand()
                    .domain(_.uniq(
                        _.map(data, 'Funding Org:Name')
                    ))
                    .range([eventData.height, 0]);
                r = d3.scaleLinear()
                    .domain(d3.extent(data, function(d) {
                        return d['DocumentWeight'];
                    }))
                    .range([5, 50]);
                
                eventData.svg.selectAll('.funding-org-year-bubble')
                    .data(data)
                    .enter().append('circle')
                    .attr('class', 'funding-org-year-bubble')
                    .attr('cx', function(d) {
                        return x(d.Date);
                    })
                    .attr('cy', function(d) {
                        return y(d['Funding Org:Name']);
                    })
                    .attr('r', function(d) {
                        return r(d['DocumentWeight']);
                    });
            }
        }
    }
  });