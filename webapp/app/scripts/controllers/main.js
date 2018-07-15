'use strict';

/**
 * @ngdoc function
 * @name 360givingApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the 360givingApp
 */
angular.module('360givingApp')
  .controller('MainCtrl', function ($http, $q, $rootScope, MasterData, Events) {
    
    
    // load all the data stuff
    var promises = []
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
            // replace some predefined string n-grams
            for(var i=0; i<topic_keywords.data.topic_words.length; i++) {
              topic_keywords.data.topic_words[i] = _.replace(
                topic_keywords.data.topic_words[i], 
                new RegExp(response.data.ngram_join_string, 'g'),
                '-'
              );
            }

            // zip topic terms and its weights
            MasterData.topics[topicId] = _.zip(
              topic_keywords.data.topic_words,
              topic_keywords.data.topic_weights
            )
          });

          // notify data is available
          $rootScope.$broadcast(Events.DATA_LOADED);
        });
      });
    
    

  });
