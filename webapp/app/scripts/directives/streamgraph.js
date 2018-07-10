'use strict';

/**
 * @ngdoc directive
 * @name 360givingApp.directive:streamgraph.js
 * @description
 * # streamgraph.js
 */
angular.module('360givingApp')
  .directive('streamgraph', function (TooltipService) {
    return {
        template: '<div class="streamgraph">' +
                    '<div class="topic-words-placeholder"></div>' +
                    '<svg></svg>' +
                  '</div>',
      restrict: 'E',
      scope: {},
      link: function (scope, element, attrs) {
        var width,
            height,
            paths,
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
            t = d3.transition()
                .duration(750)
                .ease(d3.easeLinear),
            getQuarter = function(d) {
                return d.getFullYear() + ' Q' + (Math.floor(d.getMonth() / 3) + 1);
            };

            
        scope.createStreamGraph     = createStreamGraph;
        scope.addCurrentDateLine    = addCurrentDateLine;
        scope.init = init;
        
        scope.init();




        //////////////////////////////////////////////////////
        function createStreamGraph() {
            var timeParse = d3.timeParse("%Y-%m-%d"),
                colorScale = d3.scaleSequential(d3.interpolateGnBu).domain([-15,15]), //-15 to avoid lightest colors
                svg;
            
            
            function selectTopic(_d, _i) {
                var topics = [
                    ['youth', 19],
                    ['advantatge', 13],
                    ['sport', 11],
                    ['garden', 10],
                    ['work', 7],
                    ['school', 3],
                    ['family', 1],
                    ['disease', 1]
                ]
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
                /*d3.select(this)
                    .transition(t)
                    .attr('transform', 'translate(0,-50)');
                paths
                    .filter(function(d,i) {
                        return _i != i;
                    })
                    .transition(t)
                    .style('opacity', '0');*/
                
            }
    
            function makeStreamGraph(error, amountAwarded, documentWeight, identifier) {
                var data = [],
                    o,
                    csvdata = documentWeight, //take one file as first
                    keys = _.filter(
                    _.keys(_.first(csvdata)),
                    function(key) { 
                        return key.indexOf("topic") != -1; 
                    });
                
                keys.push('index');

                csvdata.forEach(function(d) {
                    o = _.pick(d, keys);
                    _.forIn(o, function(value, key) {
                        o[key] = (key == 'index')? timeParse(o[key]) : parseFloat(o[key]);
                    });
                    data.push(o);
                });
                
                // filter first years?
                /*data = _.filter(data, function(d) {
                    return (new Date(d['index'])).getFullYear() >= 2004;
                })*/
            

                var stack = d3.stack()
                    .keys(
                    _.filter(
                        _.keys(_.first(data)), 
                        function(key) { 
                        return key.indexOf("topic") != -1; 
                        })
                    )            
                    // this combination of order and offset
                    // seems the more legible
                    .order(d3.stackOrderDescending).offset(d3.stackOffsetSilhouette);
                    //.order(d3.stackOrderInsideOut).offset(d3.stackOffsetWiggle)
                    //.offset(d3.stackOffsetSilhouette);

                var series = stack(data);

                x = d3.scaleTime()
                    .domain(d3.extent(data, function(d) { 
                    return d.index; 
                    }))
                    .range([0, width]);

                // setup axis
                var xAxis = d3.axisBottom(x);

                y = d3.scaleLinear()
                    .domain([
                        d3.min(series, function(serie) { return d3.min(serie, function(d) { return d[0]; }); }),
                        d3.max(series, function(serie) { return d3.max(serie, function(d) { return d[1]; }); })
                    ])
                    .range([height, 0]);

                var area = d3.area()
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

                paths = svg.selectAll("path")
                    .data(series)
                    .enter().append("path")                    
                    .attr("d", area)
                    .attr('class', 'topic')
                    .style("fill", function(d, i) { 
                        return colorScale(i);
                    })
                    .on('click', selectTopic)
                    .on('mouseover', function(d, i) {
                        d3.selectAll('path.topic')
                            .filter(function(_d, _i) {
                                return _i != i;
                            })
                            .style('opacity', .2);
                    })
                    .on('mouseout', function() {
                        d3.selectAll('path.topic').style('opacity', 1);
                    })
                    .on('mousemove', function() {
                    });

                svg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0, " + height + ")")
                    .call(xAxis);  
            };

            // load files
            queue()
                .defer(d3.csv, 'data/topics_timeseries_per_Amount_Awarded.csv')
                .defer(d3.csv, 'data/topics_timeseries_per_DocumentWeight.csv')
                .defer(d3.csv, 'data/topics_timeseries_per_Identifier.csv')
                .await(makeStreamGraph);
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



        function init() {
            height = d3.select(element[0]).select('div.streamgraph').node().offsetHeight - margin.top - margin.bottom;
            width = d3.select(element[0]).select('div.streamgraph').node().offsetWidth - margin.left - margin.right;
            scope.addCurrentDateLine();
            scope.createStreamGraph();
        }
      }
    }
});
