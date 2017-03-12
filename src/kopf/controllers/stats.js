kopf.controller('statsController', ['$scope', 'ElasticService',
  function ($scope, ElasticService) {

    $scope.nodes = [];
    $scope.indieces = [];
    $scope.all_stats = [];

    $scope.$watch(
            function () {
              return ElasticService.cluster;
            },
            function (current, previous) {
              $scope.refresh();
            },
            true
            );

    $scope.initializeController = function () {
      $scope.nodes = ElasticService.getNodes();
      $scope.indices = ElasticService.getIndices();
    };

    $scope.refresh = function () {
      $scope.nodes = ElasticService.getNodes();
      $scope.indices = ElasticService.getIndices();
      $scope.all_stats = [];

      for (i = 0; i < $scope.nodes.length; i++) {
        $scope.all_stats.push(
                new Stats($scope.nodes[i], $scope.indices[i]));
      }
    };
  }
]);
