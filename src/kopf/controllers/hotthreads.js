kopf.controller('HotThreadsController', ['$scope', 'ElasticService',
  'AlertService',
  function($scope, ElasticService, AlertService) {

    $scope.node = undefined;

    $scope.nodes = [];

    $scope.threads = 3;

    $scope.type = 'cpu';

    $scope.types = ['cpu', 'wait', 'block'];

    $scope.ignoreIdleThreads = true;

    $scope.nodesHotThreads = undefined;

    $scope.execute = function() {
      ElasticService.getHotThreads($scope.node, $scope.type, $scope.threads,
          $scope.ignoreIdleThreads,
          function(result) {
            $scope.nodesHotThreads = result;
          },
          function(error) {
            AlertService.error('Error while fetching hot threads', error);
            $scope.nodesHotThreads = undefined;
          }
      );
    };
  }

]);
