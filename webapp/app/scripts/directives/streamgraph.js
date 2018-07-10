'use strict';

/**
 * @ngdoc directive
 * @name pslDashboardApp.directive:vizProductionLabs.chart.js
 * @description
 * # vizProductionLabs.chart.js
 */
angular.module('360givingApp')
  .directive('streamgraph', function () {
    return {
        template: '<div class="streamgraph">'+
                    '<svg></svg>' +
                  '</div>',
      restrict: 'E',
      scope: {},
      link: function (scope, element, attrs) {
        var width,
            height,
            paths,
            vertical,
            margin = {
                top: 20, 
                right: 20, 
                bottom: 50, 
                left: 20
            };

            
        scope.createStreamGraph     = createStreamGraph;
        scope.addCurrentDateLine    = addCurrentDateLine;
        scope.init = init;
        
        scope.init();




        //////////////////////////////////////////////////////
        function createStreamGraph() {
            var timeParse = d3.timeParse("%Y-%m-%d"),
                colorScale = d3.scaleSequential(d3.interpolateGnBu).domain([-15,15]), //-15 to avoid lightest colors
                svg,
                t = d3.transition()
                    .duration(750)
                    .ease(d3.easeLinear);
            
            
            function selectTopic(_d, _i) {
                d3.select(this)
                    .transition(t)
                    .attr('transform', 'translate(0,-50)');
                paths
                    .filter(function(d,i) {
                        return _i != i;
                    })
                    .transition(t)
                    .style('opacity', '0');
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
                data = _.filter(data, function(d) {
                    return (new Date(d['index'])).getFullYear() >= 2004;
                })
            

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

                var x = d3.scaleTime()
                    .domain(d3.extent(data, function(d) { 
                    return d.index; 
                    }))
                    .range([0, width]);

                // setup axis
                var xAxis = d3.axisBottom(x);

                var y = d3.scaleLinear()
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
                    .style("fill", function(d, i) { 
                        return colorScale(i);
                    })
                    .on('click', selectTopic)
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
                    .attr("x1", mousex)
                    .attr("x2", mousex)
                    .attr("y1", 0)
                    .attr("y2", height);
            };

            vertical = d3.select(element[0]).select("svg")
                .append("line")
                .attr('class', 'current-date');
        
            d3.select(element[0]).select('div.streamgraph')
                .on("mousemove", moveLine)
                .on("mouseover", moveLine);
        };



        function init() {
            height = d3.select(element[0]).select('div.streamgraph').node().offsetHeight - margin.top - margin.bottom;
            width = d3.select(element[0]).select('div.streamgraph').node().offsetWidth - margin.left - margin.right;
            scope.createStreamGraph();
            scope.addCurrentDateLine();
        }
      }
    }
});
