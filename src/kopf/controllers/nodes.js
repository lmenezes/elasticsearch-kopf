kopf.controller('NodesController', ['$scope', 'ConfirmDialogService',
  'AlertService', 'ElasticService',
  function($scope, ConfirmDialogService, AlertService, ElasticService) {

    $scope.cluster = undefined;
    $scope.cluster_health = undefined;
    $scope.nodes = [];

    $scope.$watch(
        function() {
          return ElasticService.clusterHealth;
        },
        function(newValue, oldValue) {
          if (isDefined(ElasticService.clusterHealth)) {
            $scope.cluster_health = ElasticService.clusterHealth;
          } else {
            $scope.cluster_health = undefined;
          }
        }
    );

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
      $scope.nodes = nodes;
    };

  }

]);
