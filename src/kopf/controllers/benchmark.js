kopf.controller('BenchmarkController', ['$scope', '$location', '$timeout', 'AlertService', function($scope, $location, $timeout, AlertService) {
	$scope.bench = new Benchmark();
	$scope.competitor = new Competitor();
	$scope.indices = [];
	$scope.types = [];

	$scope.$on('loadBenchmarkEvent', function() {
		if (isDefined($scope.cluster)) {
			$scope.indices = $scope.cluster.indices || [];
		}
	});
	
	$scope.addCompetitor=function() {
		if (notEmpty($scope.competitor.name)) {
			this.bench.addCompetitor($scope.competitor);
			$scope.competitor = new Competitor();	
		} else {
			AlertService.error("Competitor needs a name");
		}
	};
	
	$scope.removeCompetitor=function(index) {
		$scope.bench.competitors.splice(index, 1);
	};
	
	$scope.editCompetitor=function(index) {
		var edit = $scope.bench.competitors.splice(index, 1);
		$scope.competitor = edit[0];
	};
	
	$scope.runBenchmark=function() {
		$('#benchmark-result').html('');
		try {
			var json = $scope.bench.toJson();
			$scope.client.executeBenchmark(json, 
				function(response) {
					$scope.result = JSONTree.create(response);
					$('#benchmark-result').html($scope.result);
				},
				function(error) {
					$scope.updateModel(function() {
						if (error.status == 503) {
							AlertService.info("No available nodes for executing benchmark. At least one node must be started with '--node.bench true' option.");
						} else {
							AlertService.error(error.responseJSON.error);
						}
					});
				}
			);
		} catch (error) {
			AlertService.error(error);
		}
	};
	
}]);