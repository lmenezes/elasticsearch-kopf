function BenchmarkController($scope, $location, $timeout) {
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
		this.bench.addCompetitor($scope.competitor);
		$scope.competitor = new Competitor();
	};
	
	$scope.removeCompetitor=function(index) {
		console.log($scope.bench.competitors[index]);
	};
	
	$scope.runBenchmark=function() {
		console.log($scope.bench.toJson());
		$scope.client.executeBenchmark($scope.bench.toJson(), 
			function(response) {
				$scope.result = JSONTree.create(response);
				$('#benchmark-result').html($scope.result);
			},
			function(error) {
				console.log(error);
			}
		);
	};
	
}