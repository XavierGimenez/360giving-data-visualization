'use strict';

/**
 * @ngdoc function
 * @name 360givingApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the 360givingApp
 */
angular.module('360givingApp')
  .controller('MainCtrl', function ($http, $q, MasterData) {
    var deferred = $q.defer(),
        promises = [];
    
    // load all the data stuff
    $http.get('data/config.json')
      .then(function(response) {

        for(var i = 0; i< response.data.n_components; i++) {
          promises.push(
            $http.get('data/topic' + i + '_keywords.json')
          );
        }
        $q.all(promises)
        .then(function(topics_keywords) {

          MasterData.topics = {};
          
          topics_keywords.forEach(function(topic_keywords) {
            // key topic id
            var url = topic_keywords.config.url
            var topicId = topic_keywords.config.url.substring(
              url.indexOf('topic'), url.indexOf('_keywords')
            )
            // zip topic terms and its weights
            MasterData.topics[topicId] = _.zip(
              topic_keywords.data.topic_words,
              topic_keywords.data.topic_weights
            )
          });
        });
      });
    
    

  });
