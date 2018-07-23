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
                opacity,
                simulation,
                simulations = [],
                svg,
                sizeFont,
                parseTime = d3.timeParse("%B %Y"),
                colorScale;

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
                    .range([eventData.height - (eventData.heightDomain * 1.2), 0]);

                r = d3.scaleSqrt()
                    .domain(d3.extent(data, function(d) {
                        return d['Amount Awarded'];
                    }))
                    .range([2, 20]);
                opacity = d3.scaleLinear()
                    .domain(d3.extent(data, function(d) {
                        return d['DocumentWeight'];
                    }))
                    .range([.2, .7]);
                
                colorScale = d3.scaleSequential(d3.interpolatePuRd)
                    .domain(d3.extent(data, function(d) {
                        return d['DocumentWeight'];
                    }));
                // modify to domain so we don't encode lightest colors
                var half = colorScale.domain()[0] - ( (colorScale.domain()[1] - colorScale.domain()[0] ) / 2 );
                colorScale.domain([
                    colorScale.domain()[0] - half,
                    colorScale.domain()[1]
                ]);

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

                sizeFont = d3.scaleLinear()
                    .domain([0, _.first(totalAmounts)])
                    .range([10, 40]);

                
                // set final obj
                var rankedData;
                if(totalAmounts.length > 10) {
                    rankedData = {};
                    var thresholdAmount = _.nth(totalAmounts, 9);
                    _.keys(groupedData)
                    .forEach(function(fundingOrgName, i) {
                        if(groupedData[fundingOrgName].totalAmount >= thresholdAmount)
                            rankedData[fundingOrgName] = groupedData[fundingOrgName];
                    });
                }
                else
                    rankedData = groupedData;
                
                groupedData = _.reverse(
                    _.sortBy(
                        _.toPairs(rankedData),
                        function(d) {
                            return d[1].totalAmount;
                        }
                    )
                );

                y.domain(
                    _.map(
                        groupedData, 
                        function(d) {
                            return d[0];
                        })
                );

                // left axis label
                svg.append("text")
                    .attr('class', 'axis-label-left')
                    .attr("transform", "rotate(-90)")
                    .attr("y", 0 - eventData.margin.left)
                    .attr("x",0 - (y.range()[0] / 2))
                    .attr("dy", "1em")
                    .style("text-anchor", "middle")
                    .text("Top 10 Funding Organizations"); 
                
                // right axis label
                svg.append("text")
                    .attr('class', 'axis-label-right')
                    .attr("transform", "rotate(90)")
                    .attr("y", -(eventData.width + (eventData.margin.right / 2)) )
                    .attr("x", (y.range()[0] / 2))
                    .attr("dy", "1em")
                    .style("text-anchor", "middle")
                    .text("More contribution"); 
                svg.append("text")
                    .attr('class', 'axis-label-right-arrow')
                    .attr("x", eventData.width)
                    .attr("y", (y.range()[0] / 2))
                    .attr("dy", "1em")
                    .style("text-anchor", "middle")
                    .text("↓"); 

                y.domain()
                .forEach(function(fundingOrgName, i) {
                    var fundingOrg = _.find(
                        groupedData,
                        function(arr) {
                            return fundingOrgName == arr[0];
                        }
                    );
                    simulations.push(
                        d3.forceSimulation(fundingOrg[1])
                            .force('x', d3.forceX(function(d) {
                                return x(d.Date);
                            }).strength(1))
                            .force('y', d3.forceY(y(fundingOrgName)))
                            .force('collide', d3.forceCollide().radius(function(d) {
                                return r(d['Amount Awarded']) * 1.1;
                            }))
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
                            .polygons(fundingOrg[1])
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
                        .attr('fill', function(d) {
                            if(d)
                                return colorScale(d.data['DocumentWeight']);
                        })
                        /*.style('opacity', function(d) {
                            if(d) {
                                console.log( d.data['DocumentWeight'], opacity(d.data['DocumentWeight']) )
                                return opacity(d.data['DocumentWeight']);
                            }
                        })*/
                        .on('mouseover', function(d) {
                            TooltipService.show(
                                d.data['Title'],
                                d.data['Funding Org:Name'],
                                [
                                    {   'key'   : 'Amount Awarded',
                                        'value' : '£' + d3.format(",.0f")(d.data['Amount Awarded'])
                                    },
                                    {
                                        'key'   : 'Award Data',
                                        'value' : d3.timeFormat("%b %Y")(d.data['Date'])
                                    },
                                    {
                                        'key'   : 'Relatedness',
                                        'value' : d3.format(",.2f")(d.data['DocumentWeight'])
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
                    
                    svg
                        .append('text')
                        .attr('class', 'fundingOrg')
                        .attr('transform', 'translate(' +  eventData.margin.left + ',' + y(fundingOrgName)+ ')')
                        .text('£' + d3.format(".2s")(fundingOrg[1].totalAmount) + ' - ' + fundingOrgName);    
                });

            }
        }
    }
  });