'use strict';

/**
 * @ngdoc function
 * @name 360givingApp.directive:typeahead
 * @description
 * # typeahead
 * Controller of the 360givingApp
 */
angular.module('360givingApp')
  .directive('typeahead', function ($rootScope, Events, MasterData) {
    return {
        restrict: 'E',
        template:   '<div>' + 
                        '<input type="text" ng-model="selected" uib-typeahead="org for org in orgs | filter:$viewValue | limitTo:8" class="form-control" placeholder="Search for an organization..." typeahead-on-select="onSelect($item, $model, $label, $event)">' +
                    '</div>',
        scope : {
        },
        link: function postLink($scope) {
            $scope.selected = undefined;
            $scope.$on(Events.DATA_LOADED, function() {
                $scope.orgs = _.map(MasterData.fundingOrgs, 'Funding Org:Name');
                $scope.onSelect = function($item, $model, $label, $event) {
                    $rootScope.$broadcast(Events.FUNDING_ORG_SELECTED, $scope.selected);  
                }
            });
        }
    }
  });