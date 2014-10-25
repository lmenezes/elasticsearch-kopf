kopf.controller('IndexSettingsController', ['$scope', '$location', '$timeout',
  'IndexSettingsService', 'AlertService', 'ElasticService',
  function($scope, $location, $timeout, IndexSettingsService, AlertService,
           ElasticService) {

    $scope.service = IndexSettingsService;

    $scope.save = function() {
      var index = $scope.service.index;
      var settings = $scope.service.settings;
      var newSettings = {};
      var editableSettings = $scope.service.editable_settings;
      // TODO: could move that to editable_index_settings model
      editableSettings.valid_settings.forEach(function(setting) {
        if (notEmpty(editableSettings[setting])) {
          newSettings[setting] = editableSettings[setting];
        }
      });
      ElasticService.client.updateIndexSettings(index,
          JSON.stringify(newSettings, undefined, ''),
          function(response) {
            AlertService.success('Index settings were successfully updated',
                response);
            $scope.refreshClusterState();
          },
          function(error) {
            AlertService.error('Error while updating index settings', error);
          }
      );
    };

    $scope.initializeController = function() {
      var index = $location.search().index;
      ElasticService.client.getIndexMetadata(index,
          function(metadata) {
            IndexSettingsService.loadSettings(index, metadata.settings);
          },
          function(error) {
            AlertService.error('Error while loading index settings for [' +
                index + ']',
                error);
          }
      );
    };

  }
]);
