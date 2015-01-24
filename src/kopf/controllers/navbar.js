kopf.controller('NavbarController', ['$scope', '$location',
  'ExternalSettingsService', 'ElasticService', 'AlertService',
  'HostHistoryService', 'DebugService',
  function($scope, $location, ExternalSettingsService, ElasticService,
           AlertService, HostHistoryService, DebugService) {

    $scope.new_refresh = ExternalSettingsService.getRefreshRate();
    $scope.theme = ExternalSettingsService.getTheme();
    $scope.new_host = '';
    $scope.current_host = ElasticService.getHost();
    $scope.host_history = HostHistoryService.getHostHistory();

    $scope.clusterStatus = undefined;
    $scope.clusterName = undefined;
    $scope.fetchedAt = undefined;

    $scope.debugEnabled = DebugService.isEnabled();

    $scope.$watch('debugEnabled',
        function(newValue, oldValue) {
          if (newValue != oldValue) {
            DebugService.toggleEnabled();
          }
        }
    );

    $scope.$watch(
        function() {
          return ElasticService.getHost();
        },
        function(newValue, oldValue) {
          $scope.current_host = ElasticService.getHost();
        }
    );

    $scope.$watch(
        function() {
          return ElasticService.cluster;
        },
        function(newValue, oldValue) {
          if (isDefined(ElasticService.cluster)) {
            $scope.clusterStatus = ElasticService.cluster.status;
            $scope.clusterName = ElasticService.cluster.name;
            $scope.fetchedAt = ElasticService.cluster.fetched_at;
          } else {
            $scope.clusterStatus = undefined;
            $scope.clusterName = undefined;
            $scope.fetchedAt = undefined;
          }
        }
    );

    $scope.handleConnectToHost = function(event) {
      if (event.keyCode == 13 && notEmpty($scope.new_host)) {
        $scope.connectToHost($scope.new_host);
      }
    };

    $scope.connectToHost = function(host) {
      try {
        ElasticService.connect(host);
        HostHistoryService.addToHistory(ElasticService.connection.host);
        $scope.host_history = HostHistoryService.getHostHistory();
      } catch (error) {
        AlertService.error('Error while connecting to new target host', error);
      } finally {
        $scope.current_host = ElasticService.connection.host;
        ElasticService.refresh();
      }
    };

    $scope.changeRefresh = function() {
      ExternalSettingsService.setRefreshRate($scope.new_refresh);
    };

    $scope.changeTheme = function() {
      ExternalSettingsService.setTheme($scope.theme);
    };

  }
]);
