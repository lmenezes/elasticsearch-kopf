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
      if (isDefined(ElasticService.cluster)) {
        var nodes = ElasticService.cluster.getNodes(true);
        $scope.nodes = nodes.filter(function(node) {
          return $scope.filter.matches(node);
        });
      } else {
        $scope.nodes = [];
      }
    };

  }

]);
