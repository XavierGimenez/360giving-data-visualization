'use strict';

/**
 * @ngdoc service
 * @name 360givingApp.service.TooltipService
 * @description
 * # TooltipService
 */
angular.module('360givingApp')
  .service('TooltipService', function () {
    

    // if we want some offset to apply given the current position of the tooltip
    var offsetY = 0,
        offsetX = 0;

    this.show = function(title, subtitle, datablocks, vizspecs, footer) {

      // in case there is no d3.event, set the position to 0. Assume
      // that method moveTo(x,y) will be called to place the tooltip
      var posx = (d3.event)?  d3.event.x : 0,
          posy = (d3.event)?  d3.event.y : 0;

      //positionate tooltip
      var tooltip = d3.select('#node-tooltip')
        .style('display', 'block')
        .style('left', posx + 'px');

      //remove previous content
      tooltip.select('.node-tooltip-data-container').selectAll('.node-tooltip-data-block').remove();
      tooltip.select('.node-tooltip-data-container').selectAll('.node-tooltip-data-separator').remove();
      tooltip.select('#node-tooltip-viz-container').selectAll('*').remove();
      tooltip.select('.node-tooltip-data-footer').html('');

      //update title
      tooltip.select('.node-tooltip-title').html(title);

      //update subtitle
      tooltip.select('.node-tooltip-subtitle').html(subtitle);

      datablocks.forEach(function(datablock) {
        //add data
        var datablockDiv = tooltip.select('.node-tooltip-data-container').append('div').attr('class','node-tooltip-data-block')
        datablockDiv.append('div').attr('class', 'node-tooltip-data-name').html(datablock.key);
        datablockDiv.append('div').attr('class', 'node-tooltip-data-value').html(datablock.value);
        tooltip.select('.node-tooltip-data-container').append('div').attr('class','node-tooltip-data-separator')
      });

      // delete last separator
      tooltip.select('.node-tooltip-data-separator:last-of-type').remove();

      // add footer
      if(footer && footer != ''){
        tooltip.select('.node-tooltip-footer').html(footer);
      } else {
        tooltip.select('.node-tooltip-footer').html('');
      }

      // and move up the content according to its size
      // so it does not overlapd with the mouse. Take
      // into account the presence of the viz: don't
      // wait until the viz is rendered to get the height
      // but get it from the viz specs
      var offsetHeight = tooltip.node().offsetHeight
        + ((vizspecs)? vizspecs.height + 60 : 20);
      tooltip.style('top', (posy - offsetHeight - offsetY) + 'px');

      // if tooltip is placed out of the boundaries of the screen,
      // automatically placed it inside
      var tooltipWidth = tooltip.node().getBoundingClientRect().width,
          tooltipX = tooltip.node().getBoundingClientRect().left,
          windowWidth = $(window).width(),
          tooltipY = tooltip.node().getBoundingClientRect().top;
      if ((tooltipX + tooltipWidth) > windowWidth){
        tooltip.style('left', (tooltipX - tooltipWidth - 5) + 'px');
      }
      if (tooltipY < 0){
        var topPosition = posy  + 20;
        tooltip.style('top', topPosition + 'px');
      }
    }

  this.hide = function() {
    d3.select('#node-tooltip').style('display', 'none');
  };

  this.moveTo = function(left, top) {
    d3.select('#node-tooltip')
      .style('left', left + 'px')
      .style('top', (top - offsetY) + 'px');
  }
});