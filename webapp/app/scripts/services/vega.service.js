'use strict';

/**
 * @ngdoc function
 * @name 360givingApp.service: VegaService
 * @description
 * # Events
 * Service of the 360givingApp
 */
angular.module('360givingApp')
  .service('VegaService', function (Events) {


    this.view = function(vega_spec, DOM_ID, tooltipHandler, tooltipReleaser) {
      
      // add a mouseout signal to all the specs
      if(vega_spec.signals == undefined)
        vega_spec.signals = [];
      
      if(_.find(vega_spec.signals, ['name', 'vega_mouseout']) == undefined)
      vega_spec.signals.push({
            'name'  : 'vega_mouseout',
            'value' : 0,
            'on'    : [{ 'events': '*:mouseout', 'update': '{}' }]
        });
      
        var view = new vega.View(vega.parse(vega_spec))
            .renderer('svg') 
            .initialize('#' + DOM_ID)
            .hover()
            .run();
        
        // vega does not include a 'mouse out' event listener at view level,
        // so we need to include a signal in the vega spec in order to
        // listen for mouseout events. We could also add a signal for
        // the mouseover event as well, but the data received is not
        // so complete as the data received in the mouseover event at
        // the level of the whole view.
        // other option is to use the tooltip plugin of vega, but 
        // then you should specify the tooltips in the vega spec and
        // format the data there: no very practical for our needs.
        view.addSignalListener('vega_mouseout', tooltipReleaser);        
        view.addEventListener(Events.VEGA_MOUSEOVER, tooltipHandler);

        return view;
    }
  });