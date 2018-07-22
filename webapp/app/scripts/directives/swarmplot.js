'use strict';

/**
 * @ngdoc function
 * @name 360givingApp.directive:swarmplot
 * @description
 * # swarmplot
 * Controller of the 360givingApp
 */
angular.module('360givingApp')
  .directive('swarmplot', function ($rootScope, Events, TooltipService) {
    return {
        restrict: 'E',
        template:   '<div id="{{DOM_ID}}"></div>',
        scope : {
        },
        link: function postLink($scope) {
            var x,
                y,
                r,
                simulation,
                simulations = [],
                svg;

            $scope.render = render;

            $rootScope.$on(Events.TOPIC_SELECTED, function(event, eventData) {
                d3.csv('data/' + eventData.topicId + '_documents.csv', function(error, data) {
                    data.forEach(function(d) {
                        d.Date = new Date(d['Award Date']);
                        d['DocumentWeight'] = +d['DocumentWeight'];
                        d['Amount Awarded'] = +d['Amount Awarded'];
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
                    .range([eventData.height - eventData.heightDomain, 0]);

                r = d3.scaleLinear()
                    .domain(d3.extent(data, function(d) {
                        return d['Amount Awarded'];
                    }))
                    .range([1, 20]);    
                
                svg = eventData.svg
                    .append('g')
                    .attr('class', 'swarmplot')
                    .attr('transform', 'translate(' + eventData.margin.left + ',' + eventData.margin.top + ')');
                
                var groupedData = _.groupBy(data, 'Funding Org:Name')

                // add total amount awarded per funding Org.
                var totalAmounts = []
                _.keys(groupedData).forEach(function(key) { 
                    groupedData[key].totalAmount = _.sumBy(groupedData[key], 'Amount Awarded'); 
                    totalAmounts.push(groupedData[key].totalAmount);
                });
                totalAmounts = _.reject(totalAmounts, _.isUndefined);
                totalAmounts.sort(function(a, b) { return b - a;});
                var thresholdAmount = _.nth(totalAmounts, 9);

                // set final obj
                var rankedData = {};
                _.keys(groupedData)
                    .forEach(function(fundingOrgName, i) {
                        if(groupedData[fundingOrgName].totalAmount >= thresholdAmount)
                            rankedData[fundingOrgName] = groupedData[fundingOrgName];
                    });
                groupedData = rankedData;
                y.domain(_.keys(groupedData));

                _.keys(groupedData)
                .forEach(function(fundingOrgName, i) {
                    simulations.push(
                        d3.forceSimulation(groupedData[fundingOrgName])
                            .force('x', d3.forceX(function(d) {
                                return x(d.Date);
                            }).strength(2))
                            .force('y', d3.forceY(y(fundingOrgName)))
                            .force('collide', d3.forceCollide(4))
                            .stop()
                        );

                    for (var i = 0; i < 120; ++i)
                        _.last(simulations).tick();
                    
                    svg
                        .append('line')
                        .attr('class', 'fundingOrg')
                        .attr('x1', 0)
                        .attr('x2', eventData.width)
                        .attr('y1', y(fundingOrgName))
                        .attr('y2', y(fundingOrgName));
                    
                    svg
                        .append('text')
                        .attr('class', 'fundingOrg')
                        .attr('transform', 'translate(0,' + y(fundingOrgName)+ ')')
                        .text(fundingOrgName);

                    var cell = svg.append('g')
                        .attr('class', 'cells-' + fundingOrgName)
                        .selectAll('g')
                        .data(
                            d3.voronoi()
                            .extent([
                                [-eventData.margin.left, -eventData.margin.top],
                                [eventData.width + eventData.margin.right, y(fundingOrgName) + y.bandwidth() + eventData.margin.bottom]
                            ])
                            .x(function(d) { return d.x;})
                            .y(function(d) { return d.y;})
                            .polygons(groupedData[fundingOrgName])
                        )
                        .enter()
                        .append('g');
                    
                    cell
                        .append('circle')
                        .attr('cx', function(d) {
                            if(d)
                                return d.data.x;
                        })
                        .attr('cy', function(d) {
                            if(d)
                                return d.data.y;
                        })
                        .attr('r', function(d) {
                            if(d)
                                return r(d.data['Amount Awarded']);
                        })
                        .on('mouseover', function(d) {
                            TooltipService.show(
                                d.data['Title'],
                                d.data['Funding Org:Name'],
                                [
                                    {   'key'   : 'Amount Awarded',
                                        'value' : '£' + d3.format(",.0f")(d.data['Amount Awarded'])
                                    }
                                ]
                            );
                        })
                        .on('mouseout', TooltipService.hide);
                    cell.append('path')
                        .attr('class', 'swarmplot')
                        .attr('d', function(d) {
                            if(d)
                                return "M" + d.join("L") + "Z"; 
                        });
                });

            }
        }
    }
  });