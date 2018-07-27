'use strict';

/**
 * @ngdoc function
 * @name 360givingApp.directive:orgtopics
 * @description
 * # orgtopics
 * Controller of the 360givingApp
 */
angular.module('360givingApp')
  .directive('orgtopics', function ($rootScope, Events, MasterData, TooltipService, $timeout) {
    return {
        restrict: 'E',
        template:   '<div>' +
                        '<div ng-if="showNoData" class="description">' + 
                            '<p>Sorry, there are not grants with significant relatedness to the discovered themes...</p>' + 
                        '</div>' +
                        '<div ng-if="showDescription" class="description">' + 
                            '<p>Themes containing grants from <span>{{orgName}}</span> and its yearly contribution, either by its relatedness, amount awareded or nº of grants</p>' + 
                        '</div>' +
                        '<div ng-if="showDescription" class="property-selector btn-group">' +
                            '<p>Select measure to display:</p>' +
                            '<label class="btn btn-default btn-xs" ng-model="$parent.radioModel" uib-btn-radio="\'Amount Awarded\'">Amount Awarded</label>' +
                            '<label class="btn btn-default btn-xs" ng-model="$parent.radioModel" uib-btn-radio="\'DocumentWeight\'">Relatedness</label>' +
                            '<label class="btn btn-default btn-xs" ng-model="$parent.radioModel" uib-btn-radio="\'Identifier\'">Nº of grants</label>' +
                        '</div>' + 
                        '<div class="topics">' + 
                        '</div>' + 
                    '</div>',
        scope : {
        },
        link: function postLink($scope, element) {
            var org,
                x,
                y,
                svg,
                margin,
                width,
                height,
                topics = [],
                colorScaleBar,
                colorScale = d3.scaleLinear()
                    .range(["rgb(123, 203, 196)", "rgb(8, 75, 140)"]);

            $scope.showDescription  = false;
            $scope.showNoData       = false;
            $scope.orgName          = '';
            $scope.radioModel        = 'Amount Awarded';
            $scope.$watch('radioModel', function(newValue, oldValue) {
            
                if(newValue != oldValue && newValue) {
                    $scope.update();
                }
            });


            $scope.$on(Events.FUNDING_ORG_SELECTED, function(event, eventData) {
                $scope.showDescription = false;    
                $scope.showNoData = false;
                d3.select(element[0]).select(".topics").selectAll('*').remove();
                topics = [];
                $scope.topicsWithData = [];

                org = _.find(MasterData.fundingOrgs, ['Funding Org:Name', eventData]);
                $scope.orgName = org['Funding Org:Name'];

                d3.csv('data/aggs/' + org['Funding Org:Identifier'] + '_topic_agg.csv', function(error, data) {
                    data.forEach(function(d) {
                        d['Date'] = +d['Date'];
                        d['DocumentWeight'] = +d['DocumentWeight'];
                        d['Amount Awarded'] = +d['Amount Awarded'];
                        d['Identifier']     = +d['Identifier'];
                    });
                    for(var i = 0; i< MasterData.numberofTopics; i++) {
                        topics.push(
                            _.filter(data, function(d) {
                                return d['Topic'] == 'topic' + i;
                            })
                        )
                    }
                    
                    // get only those topic with grants
                    for(var i = 0; i< MasterData.numberofTopics; i++) {
                        if(_.find(topics[i], function(o) {
                            return o.Identifier > 0;
                        })) {
                            $scope.topicsWithData.push(topics[i]);
                        }
                    }

                    if($scope.topicsWithData.length > 0)
                        $scope.showDescription = true;
                    else
                        $scope.showNoData = true;

                    $timeout(function() {
                        $scope.$apply();
                    });
                    

                    var divTopics = d3.select(element[0])
                        .select('.topics')
                        .selectAll('.topic')
                        .data($scope.topicsWithData)
                        .enter()
                        .append('div')
                        .attr('class', function(d, i) {
                            return _.first(d)['Topic'];
                        });
                    
                    for(var i=0; i<$scope.topicsWithData.length; i++) {
                        var topicId = _.first($scope.topicsWithData[i])['Topic'];

                        colorScale.domain(
                            d3.extent(MasterData.topics[topicId], function(t) { return t[1]; })
                        );

                        // add bar chart
                        addChart(
                            d3.select(element[0]).select('div.' + topicId),
                            $scope.topicsWithData[i]
                        );

                        // add terms of the topic
                        d3.select(element[0]).select('div.' + topicId)
                            .selectAll('text')
                            .data(MasterData.topics[topicId])
                            .enter()
                            .append('span')
                            .style('color', function(d) {
                                return colorScale(d[1]);
                            })
                            .html(function(d) {
                                return ' ' + d[0] + ' ';
                            });
                    }
                });
            });

            $scope.update = function() {
                for(var i=0; i<$scope.topicsWithData.length; i++) {
                    var topicId = _.first($scope.topicsWithData[i])['Topic'];
                    var data = $scope.topicsWithData[i];

                    y.domain([
                        0, 
                         d3.max(data, function(d) { return d[$scope.radioModel]; })
                    ]);
                    d3.select(element[0]).select('div.' + topicId)
                        .selectAll('.bar')
                        .data(data)
                        .transition()
                        .attr("y", function(d) {
                            return y(d[$scope.radioModel]);
                        })
                        .attr("height", function(d) {
                            return height - y(d[$scope.radioModel]); 
                        })
                    putHighestLabel(
                        d3.select(element[0]).select('div.' + topicId).select('svg'),
                        data
                    );
                }
            };

            function addChart(divPlaceHolder, data) {
                svg     = divPlaceHolder.append('svg');
                margin  = {top: 0, right: 25, bottom: 0, left: 25};
                width   = divPlaceHolder.node().offsetWidth - margin.left - margin.right;
                height  = 50 - margin.top - margin.bottom;
                x       = d3.scaleBand()
                            .range([0, width])
                            .padding(0.1),
                y       = d3.scaleLinear()
                            .range([height, 20]);

                svg.attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform",  "translate(" + margin.left + "," + margin.top + ")");

                x.domain(
                    data.map(function(d) { 
                        return d['Date']; 
                    }
                ));
                y.domain([
                    0, 
                     d3.max(data, function(d) { return d[$scope.radioModel]; })
                ]);

                // append the rectangles for the bar chart
                svg.append('line')
                    .attr('x1', x.range()[0])
                    .attr('x2', x.range()[1])
                    .attr('y1', height)
                    .attr('y2', height);

                svg.selectAll(".bar")
                    .data(data)
                    .enter().append("rect")
                    .attr("class", "bar")
                    .attr("x", function(d) { 
                        return x(d['Date']); 
                    })
                    .attr("width", x.bandwidth())
                    .attr("y", function(d) {
                        return y(d[$scope.radioModel]);
                    })
                    .attr("height", function(d) {
                        return height - y(d[$scope.radioModel]); 
                    })
                    .on('mouseover', function(d) {
                        //d3.select(this).classed('hovered', true);
                        d3.select(element[0]).selectAll('.bar')
                            .filter(function(d2) {
                                return d2['Date'] == d['Date'];
                            })
                            .classed('hovered', true);
                        TooltipService.show(
                            d['Date'],
                            org['Funding Org:Name'],
                            [
                                {   'key'   : 'Amount Awarded',
                                    'value' : '£' + d3.format(",.0f")(d['Amount Awarded'])
                                },
                                {
                                    'key'   : 'Grants',
                                    'value' : d['Identifier']
                                },
                                {
                                    'key'   : 'Relatedness of grants to the theme',
                                    'value' : d3.format(",.2f")(d['DocumentWeight'])
                                }
                            ]
                        );
                    })
                    .on('mouseout', function() {
                        d3.select(element[0]).selectAll('.bar').classed('hovered', false);
                        TooltipService.hide();
                    });
                    putHighestLabel(svg, data);

                // add the x Axis
                /*svg.append("g")
                    .attr("transform", "translate(0," + height + ")")
                    .call(d3.axisBottom(x).tickValues([2002, 2008, 2014]));*/
            };

            function putHighestLabel(svg, data) {
                // get bar with max value
                var indexBar = _.findIndex(data,[ $scope.radioModel, y.domain()[1] ]);
                var year = data[indexBar]['Date'];     
                svg.selectAll('text.top-label').remove();
                svg.append('text')
                    .attr('class', 'top-label')
                    .attr('x', x(year) + (x.bandwidth()/2))
                    .attr('y', y( y.domain()[1] ) - 3)
                    .text(
                        ($scope.radioModel == 'Amount Awarded')?
                        '£' + d3.format(".2s")(data[indexBar][$scope.radioModel]) : 
                        ($scope.radioModel == 'DocumentWeight')?
                            d3.format(",.2f")(data[indexBar][$scope.radioModel]) : data[indexBar][$scope.radioModel]
                    );
            }
        }
    }
  });