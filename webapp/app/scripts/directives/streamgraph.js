'use strict';

/**
 * @ngdoc directive
 * @name 360givingApp.directive:streamgraph.js
 * @description
 * # streamgraph.js
 */
angular.module('360givingApp')
  .directive('streamgraph', function ($rootScope, TooltipService, MasterData, Events, $timeout) {
    return {
        template: '<div class="streamgraph">' +
                    '<div class="clear-topic">' + 
                        '<button ng-click="deselectTopic()" type="button" class="btn btn-warning btn-xs">Back to all themes</button>' + 
                    '</div>' +
                    '<div class="property-selector btn-group">' +
                        '<p>Select measure to display:</p>' +
                        '<label class="btn btn-default btn-xs" ng-model="radioModel" uib-btn-radio="\'amountAwarded\'">Amount Awarded</label>' +
                        '<label class="btn btn-default btn-xs" ng-model="radioModel" uib-btn-radio="\'documentWeight\'">Weight</label>' +
                        '<label class="btn btn-default btn-xs" ng-model="radioModel" uib-btn-radio="\'identifier\'">Nº of grants</label>' +
                    '</div>' + 
                    '<div class="description" ng-show="!selectedTopic">' + 
                        '<p>' + 
                            'Themes emerged from the topic analysis and its change over time. Each colored band is a theme. ' + 
                            '<span>Mouseover</span> a theme to display the terms that describe it, and ' +
                            '<span>click it</span> to see the top contributors to that theme' + 
                        '</p>' + 
                    '</div>' + 
                    '<div class="topic-words-placeholder">'+
                    '</div>' +
                    '<svg></svg>' +
                  '</div>',
      restrict: 'E',
      scope: {},
      link: function (scope, element, attrs) {
        var width,
            height,
            data = [],
            paths,
            stack,
            series,
            area,
            xAxis,
            xAxisTop,
            yAxis,
            vertical,
            currentQuarterText,
            x,
            y,
            margin = {
                top: 75, 
                right: 50, 
                bottom: 50, 
                left: 20
            },
            getQuarter = function(d) {
                return d.getFullYear() + ' Q' + (Math.floor(d.getMonth() / 3) + 1);
            },
            texture,
            topicKeys,
            gridLines,
            timeParse = d3.timeParse("%Y-%m-%d"),
            colorScale = d3.scaleSequential(d3.interpolateGnBu).domain([-15,15]), //-15 to avoid lightest colors
            svg,
            bisectDate = d3.bisector(function(d) { 
                return d.index; 
            }).left,
            selectedHeightDomain = 200;

        scope.selectedTopic         = undefined;
        scope.radioModel            = 'documentWeight';
        scope.$watch('radioModel', function(newValue, oldValue) {
            
            if(newValue != oldValue && newValue) {
                scope.updateStreamGraph();
            }
        });
        scope.datasets              = {};
        scope.makeStreamGraph       = makeStreamGraph;
        scope.updateStreamGraph     = updateStreamGraph;
        scope.addCurrentDateLine    = addCurrentDateLine;
        scope.selectTopic           = selectTopic;
        scope.deselectTopic         = deselectTopic;
        scope.init = init;
        
        scope.init();



        //////////////////////////////////////////////////////



        function showTopicKeywords(event, _d, _i) {

            d3.select('div.streamgraph .topic-words-placeholder')
                .selectAll('a')
                .remove();

            if(event.type == 'mouseout')
                return;

            var topics = MasterData.topics[_d.key];
            var sizeFont = d3.scaleLinear()
                .domain(
                    d3.extent(topics, function(d) {
                        return d[1];
                    })
                )
                .range([10, 30]);

            d3.select('div.streamgraph .topic-words-placeholder')
                .selectAll('a')
                .data(topics)
                .enter().append('a')
                .attr('class', 'topic-word')
                .style('font-size', function(d) {
                    return sizeFont(d[1]) + 'px';
                })
                .text(function(d) {
                    return d[0];
                });
        }





        function updateStreamGraph() {
            data    = scope.datasets[scope.radioModel];
            
            if(scope.selectedTopic)
               setSerieAsBaseline();
            else
                series  = stack(data);

            setScales();
                
            paths = svg.selectAll("path")
                .data(series, function(serie) {
                    return serie?   serie.key : null;
                })
                .transition()
                .duration(750)
                .attr("d", area)
            
            var t = d3.transition()
                .duration(500)
            
            d3.select(element[0]).select("svg")
                .select(".y")
                .transition(t)
                .call(yAxis)
        }





        function setScales() {
            x = d3.scaleTime()
                .domain(d3.extent(data, function(d) { 
                    return d.index; 
                }))
                .range([0, width]);

            y = d3.scaleLinear()
                .domain([
                    d3.min(series, function(serie) { return d3.min(serie, function(d) { return d[0]; }); }),
                    d3.max(series, function(serie) { return d3.max(serie, function(d) { return d[1]; }); })
                ])
                .range(
                    (scope.selectedTopic)?    [height, height-selectedHeightDomain] : [height - (height*0.1), (height*0.1)]
                );
            
            area = d3.area()
                .x(function(d) { 
                    return x(d.data.index); 
                })
                .y0(function(d) { return y(d[0]); })
                .y1(function(d) { return y(d[1]); })
                .curve(d3.curveBasis);

            if(yAxis) {
                yAxis
                    .scale(y)
                    .ticks(4)
                    .tickFormat(
                        (scope.radioModel == 'amountAwarded')? d3.formatPrefix(".1", 1e6) : d3.format(".2")
                    )
            }
        }




        function makeStreamGraph() {
            var mousex;                
            data = scope.datasets[scope.radioModel];

            // get keys of the data: the keys for the series
            // we will use it to reorder them by placing the
            // selected serie as the first one, so that serie
            // is aligned to the baseline 0 when changing the
            // order of the stack to 'stackOrderNone'
            topicKeys = _.filter(
                _.keys(_.first(data)), 
                function(key) { 
                    return key.indexOf("topic") != -1; 
                });

            stack = d3.stack()
                .keys(topicKeys)
                // this combination of order and offset
                // seems the more legible
                .order(d3.stackOrderDescending).offset(d3.stackOffsetSilhouette);
                //.order(d3.stackOrderInsideOut).offset(d3.stackOffsetWiggle)
                //.offset(d3.stackOffsetSilhouette);

            series = stack(data);

            // setup scales and axis
            setScales();
            xAxis    = d3.axisBottom(x);
            xAxisTop = d3.axisTop(x);

            area = d3.area()
                .x(function(d) { 
                    return x(d.data.index); 
                })
                .y0(function(d) { return y(d[0]); })
                .y1(function(d) { return y(d[1]); })
                .curve(d3.curveBasis);

            svg = d3.select(element[0]).select("svg")
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
                .append('g')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
            
            gridLines = svg
                .selectAll('.grid-line')
                .data(_.map(
                        _.range(
                            x.domain()[0].getFullYear()-1,
                            x.domain()[1].getFullYear() + 1,
                            2
                        ),
                        function(year) {
                            return new Date(year, 0, 1);
                        }
                    )
                )
                .enter().append('line')
                .attr('class', 'grid-line')
                .attr('x1', function(d) {
                    return x(d);
                })
                .attr('x2', function(d) {
                    return x(d);
                })
                .attr('y1', height)
                .attr('y2', 0);

            paths = svg.selectAll("path")
                .data(series, function(serie) {
                    return serie.key;
                })
                .enter().append("path")                    
                .attr("d", area)
                .attr('class', 'topic')
                .style('opacity', 0)
                .style("fill", function(d, i) { 
                    return colorScale(i);
                })
                .on('click', function(d, i) {
                    TooltipService.hide();
                    selectTopic(d, i)
                })
                .on('mouseover', function(d, i) {
                    d3.select(this)
                        .attr('_fill', d3.select(this).style('fill'));

                    texture = textures.lines()
                        .stroke(d3.select(this).style('fill'))
                        .size(4)
                        .strokeWidth(1);
                    d3.select(element[0]).select("svg").call(texture);
                    
                    d3.select(this).style('fill', texture.url());
                    showTopicKeywords(d3.event, d, i);
                })
                .on('mouseout', function() {
                    TooltipService.hide();
                    d3.select(this)
                        .style('fill', d3.select(this).attr('_fill'));
                    showTopicKeywords(d3.event);
                })
                .on('mousemove', function(d, i) {
                    mousex = d3.mouse(this)[0];
                            // get value for selected property
                    // and current date time
                    var value = _.get(
                        _.nth(
                            scope.datasets[scope.radioModel],
                            bisectDate(scope.datasets[scope.radioModel], x.invert(mousex))
                        ),
                        d.key
                    );

                    TooltipService.show(
                        getQuarter(x.invert(mousex)),
                        '',
                        [
                            { 
                                'key' : scope.radioModel == 'amountAwarded' ? 'Amount awarded' : 
                                        scope.radioModel == 'documentWeight' ? 'Accumulated Relatedness' : 'Nº of grants', 
                                'value' : scope.radioModel == 'amountAwarded' ? '£' + d3.format(",.0f")(value) : 
                                          scope.radioModel == 'documentWeight' ? d3.format(",.2f")(value) : value, 
                            }
                        ]
                    );
                });

            svg.selectAll("path")
                .transition()
                .style('opacity', 1);

            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0, " + height + ")")
                .call(xAxis);
            svg.append("g")
                .attr("class", "x axis")
                .call(xAxisTop);
            
            scope.addCurrentDateLine();
        };





        function addCurrentDateLine() {
            var mousex,
                moveLine = function() {
                    mousex = d3.mouse(this);
                    mousex = mousex[0];
                    vertical
                        .style('stroke', 'black')
                        .style('display', 'block')
                        .attr("x1", mousex)
                        .attr("x2", mousex)
                        .attr("y1", 0)
                        .attr("y2", height);
                    var placingText = [
                        mousex < (width - 100)?  'start' : 'end',
                        mousex < (width - 100)?  mousex + 5 : mousex -5
                    ];
                    currentQuarterText
                        .style('display', 'block')                        
                        .attr('text-anchor', placingText[0])
                        .attr('transform', 'translate(' + placingText[1] + ',' + height + ')')
                        .text(
                            getQuarter(x.invert(mousex))
                        );
                },
                removeLine = function() {
                    var svg = d3.select(element[0]).select("svg")
                    svg.select('line.current-date').style('display', 'none');
                    svg.select('text.current-date').style('display', 'none');
                };

            vertical = d3.select(element[0]).select("svg")
                .append("line")
                .attr('class', 'current-date');
            
            currentQuarterText = d3.select(element[0]).select('svg')
                .append('text')
                .attr('class', 'current-date');
        };





        function setSerieAsBaseline() {
            // move the clicked serie to the first
            // position and redo stack
            var newTopicKeys = _.clone(topicKeys);
            newTopicKeys.unshift(
                _.first(
                    newTopicKeys.splice(newTopicKeys.indexOf(scope.selectedTopic), 1)
                )
            );
            stack = d3.stack()
                .keys(newTopicKeys)
                .offset(d3.stackOrderInsideOut);

            // recreate series with the new offset
            // and the clicked serie moved as the 
            // first one (so it will align to the 
            // zero baseline)
            series = stack(data);
            series = [_.first(series)];
        }




        function deselectTopic() {
            yAxis = undefined;
            scope.selectedTopic = undefined;
            $rootScope.$broadcast(Events.TOPIC_DESELECTED, {
                'svg' : d3.select(element[0]).select("svg")
            });
            d3.select('.clear-topic')
                .style('opacity', 0);
            d3.select('div.streamgraph .topic-words-placeholder')
                .selectAll('a')
                .remove();
            d3.select('div.streamgraph .topic-words-placeholder')
                .style('margin-left', margin.left + 'px')
                .style('top', (margin.top * 3) + 'px');
            d3.select(element[0]).select("svg")
                .selectAll('*')
                .remove();
            
            scope.makeStreamGraph();
        }




        function selectTopic(d, i) {
            scope.selectedTopic = d.key;

            setSerieAsBaseline();
            
            y.domain([
                d3.min(series, function(serie) { return d3.min(serie, function(d) { return d[0]; }); }),
                d3.max(series, function(serie) { return d3.max(serie, function(d) { return d[1]; }); })
            ])
            .range([height, height-selectedHeightDomain]);
        
            if(yAxis == undefined) {
                yAxis = d3.axisRight(y).ticks(4);
                d3.select(element[0]).select("svg")
                    .append('g')
                    .attr('class', 'y axis')
                    .attr('transform', 'translate(' + (width + margin.left) + ', ' + margin.top + ')')
                    .call(yAxis);
            }

            var path = d3.select(element[0]).select("svg")
                .selectAll("path")
                .data(series, function(serie) {
                    return serie?   serie.key : null;
                })
                .attr('class', 'topic');

            // mantain the rollover efect on the 
            // clicked serie and align to zero
            path
                .attr('class', 'selected')
                .on('mouseover', null)
                .on('mouseout', TooltipService.hide)
                .transition()
                .duration(750)
                .delay(200)
                .attr('d', area);
            
            // removing or modifying the path.exit()
            // update the pattern within the <def>, 
            // setting it as an empty <pattern> tag ¿?
            //path.exit().style('display', 'none');
            d3.select(element[0])
                .select("svg")
                .selectAll("path.topic:not(.selected)")
                .style('display', 'none');
            
            // move keywords
            d3.select(element[0])
                .select('.topic-words-placeholder')
                .transition()
                .on('end', function() {
                    var top = d3.select(this).style('top');
                    top = top.substr(0, top.indexOf('px')) - 30;

                    d3.select('.clear-topic')
                        .style('opacity', 1)
                        .style('top', top + 'px');

                    $timeout(function() {
                        $rootScope.$broadcast(Events.TOPIC_SELECTED, {
                            'height'        : height,
                            'topicId'       : d.key,
                            'svg'           : d3.select(element[0]).select("svg"),
                            'width'         : width,
                            'margin'        : margin,
                            'heightDomain'  : selectedHeightDomain,
                            'x'             : x
                        });
                    }, 250)                    
                })
                .duration(750)
                .style('top', function() {
                    return (window.innerHeight - d3.select(this).node().offsetHeight - margin.top) + 'px';
                });
            
            $timeout(function() { scope.$apply(); });
        }



        function init() {

            // size the layout
            height = d3.select(element[0]).select('div.streamgraph').node().offsetHeight - margin.top - margin.bottom;
            width = d3.select(element[0]).select('div.streamgraph').node().offsetWidth - margin.left - margin.right;
            
            
            d3.select('div.streamgraph .topic-words-placeholder')
                .style('margin-left', margin.left + 'px')
                .style('top', (margin.top * 3) + 'px');
            d3.select('div.streamgraph .description')
                .style('margin-left', margin.left + 'px')
                .style('margin-top', (margin.top * 1.3) + 'px');

            // load files
            queue()
                .defer(d3.csv, 'data/topics_timeseries_per_Amount_Awarded.csv')
                .defer(d3.csv, 'data/topics_timeseries_per_DocumentWeight.csv')
                .defer(d3.csv, 'data/topics_timeseries_per_Identifier.csv')
                .await(function(error, amountAwarded, documentWeight, identifier) {
                    // keep and parse data from all datasets
                    scope.datasets['amountAwarded']  = amountAwarded;
                    scope.datasets['documentWeight'] = documentWeight;
                    scope.datasets['identifier']     = identifier;
                    
                    // parse dates and floats
                    var o,
                        keys = _.filter(
                            _.keys(_.first(scope.datasets[scope.radioModel])),
                            function(key) {
                                return key.indexOf("topic") != -1; 
                            });
                    keys.push('index');
                    _.keys(scope.datasets)
                        .forEach(function(datasetKey) {
                            scope.datasets[datasetKey] = _.map(
                                scope.datasets[datasetKey],
                                function(d) {
                                    o = _.pick(d, keys);
                                    _.forIn(o, function(value, key) {
                                        o[key] = (key == 'index')? timeParse(o[key]) : parseFloat(o[key]);    
                                    });
                                    return o;
                                });
                        });
                    makeStreamGraph();
                });
        }
      }
    }
});
