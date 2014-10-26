kopf.controller('ClusterSettingsController', ['$scope', '$location', '$timeout',
  'AlertService', 'ElasticService', 'ClusterService',
  function($scope, $location, $timeout, AlertService, ElasticService,
           ClusterService) {

    $scope.initializeController = function() {
      $('#cluster_settings_option a').tab('show');
      $('#cluster_settings_tabs a:first').tab('show');
      $('.setting-info').popover();
      $scope.active_settings = 'transient'; // remember last active?
      $scope.settings = new ClusterSettings(ClusterService.cluster.settings);
    };

    $scope.save = function() {
      var settings = JSON.stringify($scope.settings, undefined, '');
      ElasticService.client.updateClusterSettings(settings,
          function(response) {
            AlertService.success('Cluster settings were successfully updated',
                response);
            ClusterService.refresh();
          },
          function(error) {
            AlertService.error('Error while updating cluster settings', error);
          }
      );
    };
  }
]);
