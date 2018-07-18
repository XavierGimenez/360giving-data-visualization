'use strict';

/**
 * @ngdoc directive
 * @name 360givingApp.directive:streamgraph.js
 * @description
 * # streamgraph.js
 */
angular.module('360givingApp')
  .directive('streamgraph', function (TooltipService, MasterData) {
    return {
        template: '<div class="streamgraph">' +
                    '<div class="btn-group">' +
                        '<label class="btn btn-default btn-xs" ng-model="radioModel" uib-btn-radio="\'amountAwarded\'">Amount Awarded</label>' +
                        '<label class="btn btn-default btn-xs" ng-model="radioModel" uib-btn-radio="\'documentWeight\'">Weight</label>' +
                        '<label class="btn btn-default btn-xs" ng-model="radioModel" uib-btn-radio="\'identifier\'">Nº of grants</label>' +
                    '</div>' + 
                    '<div class="description">' + 
                        '<p>' + 
                            'Themes emerged from the topic analysis and its change over time. Each colored band is a theme. ' + 
                            '<span>Mouseover</span> a theme to display the terms that describe it, and ' +
                            '<span>click it</span> to see the top contributors to that theme' + 
                        '</p>' + 
                    '</div>' + 
                    '<div class="topic-words-placeholder"></div>' +
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
            vertical,
            currentQuarterText,
            x,
            y,
            margin = {
                top: 20, 
                right: 20, 
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
            svg;
                
        
        scope.radioModel            = 'documentWeight';
        scope.$watch('radioModel', function(newValue, oldValue) {
            console.log(newValue, oldValue);
            if(newValue != oldValue && newValue)
                scope.updateStreamGraph();
        });
        scope.datasets              = {};
        scope.makeStreamGraph       = makeStreamGraph;
        scope.updateStreamGraph     = updateStreamGraph;
        scope.addCurrentDateLine    = addCurrentDateLine;
        scope.selectTopic           = selectTopic;
        scope.init = init;
        
        scope.init();



        //////////////////////////////////////////////////////



        function showTopicKeywords(_d, _i) {
            var topics = MasterData.topics['topic' + _i];
            var sizeFont = d3.scaleLinear()
                .domain(
                    d3.extent(topics, function(d) {
                        return d[1];
                    })
                )
                .range([10, 40]);
            
            d3.select('div.streamgraph .topic-words-placeholder')
                .selectAll('a')
                .remove();

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
            series  = stack(data);
            
            setScales();
                
            paths = svg.selectAll("path")
                .data(series, function(serie) {
                    return serie?   serie.key : null;
                })
                .transition()
                .duration(750)
                .attr("d", area)
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
                .range([height, 0]);
        }




        function makeStreamGraph(error, amountAwarded, documentWeight, identifier) {
            var o,
                keys = _.filter(
                    _.keys(_.first(amountAwarded)),
                    function(key) { 
                        return key.indexOf("topic") != -1; 
                    });
                keys.push('index');

            // keep and parse data from all datasets
            scope.datasets['amountAwarded']  = amountAwarded;
            scope.datasets['documentWeight'] = documentWeight;
            scope.datasets['identifier']     = identifier;

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
            xAxis = d3.axisBottom(x);

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
                .style("fill", function(d, i) { 
                    return colorScale(i);
                })
                .on('click', selectTopic)
                .on('mouseover', function(d, i) {
                    d3.select(this)
                        .attr('_fill', d3.select(this).style('fill'));

                    texture = textures.lines()
                        .stroke(d3.select(this).style('fill'))
                        .size(4)
                        .strokeWidth(1);
                    d3.select(element[0]).select("svg").call(texture);
                    
                    d3.select(this).style('fill', texture.url());
                    showTopicKeywords(d, i);
                })
                .on('mouseout', function() {
                    d3.select(this)
                        .style('fill', d3.select(this).attr('_fill'));
                })
                .on('mousemove', function() {
                });

            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0, " + height + ")")
                .call(xAxis);  
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
                    TooltipService.show(
                        'whatever',
                        'so',
                        [
                            { 'key' : 'Percentatge' , 'value' : 23 }
                        ]
                    );
                },
                removeLine = function() {
                    var svg = d3.select(element[0]).select("svg")
                    svg.select('line.current-date').style('display', 'none');
                    svg.select('text.current-date').style('display', 'none');
                    TooltipService.hide();
                };

            vertical = d3.select(element[0]).select("svg")
                .append("line")
                .attr('class', 'current-date');
            
            currentQuarterText = d3.select(element[0]).select('svg')
                .append('text')
                .attr('class', 'current-date');;
            
            d3.select(element[0]).select('div.streamgraph')
                .on("mousemove", moveLine)
                .on("mouseover", moveLine)
                .on('mouseout', removeLine);
        };




        function selectTopic(d, i) {
            // move the clicked serie to the first
            // position and redo stack
            var newTopicKeys = _.clone(topicKeys);
            newTopicKeys.unshift(
                _.first(
                    newTopicKeys.splice(newTopicKeys.indexOf(d.key), 1)
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
            
            y.domain([
                d3.min(series, function(serie) { return d3.min(serie, function(d) { return d[0]; }); }),
                d3.max(series, function(serie) { return d3.max(serie, function(d) { return d[1]; }); })
            ])
            .range([height, height-200]);
        
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
                .on('mouseout', null)
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
                .duration(750)
                .style('top', function() {
                    return (window.innerHeight - d3.select(this).node().offsetHeight) + 'px';
                });
        }



        function init() {

            // size the layout
            height = d3.select(element[0]).select('div.streamgraph').node().offsetHeight - margin.top - margin.bottom;
            width = d3.select(element[0]).select('div.streamgraph').node().offsetWidth - margin.left - margin.right;
            d3.select('div.streamgraph .topic-words-placeholder')
                .style('margin-left', margin.left + 'px');
            d3.select('div.streamgraph .description')
                .style('margin-left', margin.left + 'px');

                scope.addCurrentDateLine();

            // load files
            queue()
                .defer(d3.csv, 'data/topics_timeseries_per_Amount_Awarded.csv')
                .defer(d3.csv, 'data/topics_timeseries_per_DocumentWeight.csv')
                .defer(d3.csv, 'data/topics_timeseries_per_Identifier.csv')
                .await(makeStreamGraph);
        }
      }
    }
});
