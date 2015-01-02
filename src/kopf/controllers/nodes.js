kopf.controller('NodesController', ['$scope', 'ConfirmDialogService',
  'AlertService', 'ElasticService', 'NodesFilter',
  function($scope, ConfirmDialogService, AlertService, ElasticService,
           NodesFilter) {

    $scope.cluster = undefined;

    $scope.filter = NodesFilter.filter;

    $scope.nodes = [];

    $scope.$watch('filter',
        function(filter, previous) {
          if (isDefined(ElasticService.cluster)) {
            $scope.setNodes(ElasticService.cluster.getNodes(true));
          } else {
            $scope.setNodes([]);
          }
        },
        true);

    $scope.$watch(
        function() {
          return ElasticService.cluster;
        },
        function(newValue, oldValue) {
          if (isDefined(ElasticService.cluster)) {
            $scope.cluster = ElasticService.cluster;
            $scope.setNodes(ElasticService.cluster.getNodes(true));
          } else {
            $scope.cluster = undefined;
            $scope.setNodes([]);
          }
        }
    );

    $scope.setNodes = function(nodes) {
      $scope.nodes = nodes.filter(function(node) {
        return $scope.filter.matches(node);
      });
    };

  }

]);
