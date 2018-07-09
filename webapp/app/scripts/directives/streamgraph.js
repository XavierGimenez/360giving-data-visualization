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
            paths;

            
        scope.createStreamGraph = createStreamGraph;
        scope.init = init;
        
        scope.init();




        //////////////////////////////////////////////////////
        function createStreamGraph() {
            var timeParse = d3.timeParse("%Y-%m-%d"),
                colorScale = d3.scaleSequential(d3.interpolateGnBu).domain([0,15]),
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

            d3.csv('data/topics_timeseries_per_Identifier.csv', function(csvdata) {
                var data = [],
                    o,
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

                var series = stack(data);

                var width = 1200,
                    height = 600;

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

                var svg = d3.select(element[0]).select("svg");
                    svg.attr('width', width);
                    svg.attr('height', height);

                paths = svg.selectAll("path")
                    .data(series)
                    .enter().append("path")
                    .attr("d", area)
                    .style("fill", function(d, i) { 
                        return colorScale(i);
                    })
                    .on('click', selectTopic);

                svg.append("g")
                    .attr("class", "axis axis--x")
                    .attr("transform", "translate(0," + (height) + ")")
                    .call(xAxis);  
            });
            /*
            var n = 20, // number of layers
            m = 200, // number of samples per layer
            k = 10, // number of bumps per layer
            t = d3.transition()
                    .duration(750)
                    .ease(d3.easeLinear);

            var stack = d3.stack().keys(d3.range(n)).offset(d3.stackOffsetWiggle),
                layers0 = stack(d3.transpose(d3.range(n).map(function() { return bumps(m, k); }))),
                layers1 = stack(d3.transpose(d3.range(n).map(function() { return bumps(m, k); }))),
                layers = layers0.concat(layers1);

            var svg = d3.select(element[0]).select("svg");
            svg.attr('width', width);
            svg.attr('height', height);

            var x = d3.scaleLinear()
                .domain([0, m - 1])
                .range([0, width]);

            var y = d3.scaleLinear()
                .domain([d3.min(layers, stackMin), d3.max(layers, stackMax)])
                .range([height, 0]);

            var z = d3.interpolateCool;

            var area = d3.area()
                .x(function(d, i) { return x(i); })
                .y0(function(d) { return y(d[0]); })
                .y1(function(d) { return y(d[1]); });

            paths = svg
                .selectAll("path")
                .data(layers0)
                .enter().append("path")
                    .attr("d", area)
                    .attr("fill", function() { return z(Math.random()); })
                    .on('click', selectTopic);


            function stackMax(layer) {
                return d3.max(layer, function(d) { return d[1]; });
            }

            function stackMin(layer) {
                return d3.min(layer, function(d) { return d[0]; });
            }

            // Inspired by Lee Byron’s test data generator.
            function bumps(n, m) {
                var a = [], i;
                for (i = 0; i < n; ++i) a[i] = 0;
                for (i = 0; i < m; ++i) bump(a, n);
                return a;
            }

            function bump(a, n) {
                var x = 1 / (0.1 + Math.random()),
                    y = 2 * Math.random() - 0.5,
                    z = 10 / (0.1 + Math.random());
                for (var i = 0; i < n; i++) {
                    var w = (i / n - y) * z;
                    a[i] += x * Math.exp(-w * w);
                }
            }

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
            */
        };


        function init() {
            height = d3.select(element[0]).select('div.streamgraph').node().offsetHeight;
            width = d3.select(element[0]).select('div.streamgraph').node().offsetWidth;
            scope.createStreamGraph();
        }
      }
    }
});
