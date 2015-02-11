kopf.controller('NodesController', ['$scope', 'ConfirmDialogService',
  'AlertService', 'ElasticService', 'AppState',
  function($scope, ConfirmDialogService, AlertService, ElasticService,
           AppState) {

    $scope.sortBy = 'name';
    $scope.reverse = false;

    $scope.setSortBy = function(field) {
      if ($scope.sortBy === field) {
        $scope.reverse = !$scope.reverse;
      }
      $scope.sortBy = field;
    };

    $scope.filter = AppState.getProperty(
        'NodesController',
        'filter',
        new NodeFilter('', true, true, true, 0)
    );

    $scope.nodes = [];

    $scope.$watch('filter',
        function(newValue, oldValue) {
          $scope.refresh();
        },
        true);

    $scope.$watch(
        function() {
          return ElasticService.cluster;
        },
        function(newValue, oldValue) {
          $scope.refresh();
        }
    );

    $scope.refresh = function() {
      var nodes = ElasticService.getNodes();
      $scope.nodes = nodes.filter(function(node) {
        return $scope.filter.matches(node);
      });
    };

    $scope.showNodeStats = function(nodeId) {
      ElasticService.getNodeStats(nodeId,
          function(nodeStats) {
            $scope.displayInfo('stats for ' + nodeStats.name, nodeStats.stats);
          },
          function(error) {
            AlertService.error('Error while loading node stats', error);
          }
      );
    };

    $scope.promptShutdownNode = function(nodeId, nodeName) {
      ConfirmDialogService.open(
          'are you sure you want to shutdown node ' + nodeName + '?',
          'Shutting down a node will make all data stored in this node ' +
          'inaccessible, unless it\'s replicated across other nodes.' +
          'Replicated shards will be promoted to primary if the primary ' +
          'shard is no longer reachable.',
          'Shutdown',
          function() {
            ElasticService.shutdownNode(nodeId);
          }
      );
    };

  }

]);
