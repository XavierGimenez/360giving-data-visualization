angular.module('360givingApp').run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('views/about.html',
    "<p>This is the about view.</p>"
  );


  $templateCache.put('views/main.html',
    "<h4>Test pag</h4> <streamgraph></streamgraph>"
  );

}]);
