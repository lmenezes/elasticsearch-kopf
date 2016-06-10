kopf.controller('statsController', ['$scope', 'ElasticService',
    'AlertService',
    function ($scope, ElasticService, AlertService) {
        // injection
        $scope.Math = window.Math;
        
        $scope.logged = false;
        $scope.ix_logged = false;
        
        $scope.nodes = [];
        $scope.indieces = [];
        $scope.recoveries = {};

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
            if ($scope.nodes.length > 0 && !$scope.logged){
                console.log($scope.nodes);
                $scope.logged = true;
            }
            if ($scope.indices.length > 0 && !$scope.ix_logged){
                console.log($scope.indices);
                $scope.ix_logged = true;
            }
        };

    }

]);
