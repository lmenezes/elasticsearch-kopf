function AnalysisController($scope, $location, $timeout) {
	$scope.indices = null;

	// by index
	$scope.field_index = '';
	$scope.field_type = '';
	$scope.field_field = '';
	$scope.field_text = '';
	$scope.field_tokens = [];
	
	// By analyzer
	$scope.analyzer_index = '';
	$scope.analyzer_analyzer = '';
	$scope.analyzer_text = '';
	$scope.analyzer_tokens = [];
	
	$scope.analyzeByField=function() {
		if ($scope.field_field.length > 0 && $scope.field_text.length > 0) {
			$scope.field_tokens = null;
			$scope.client.analyzeByField($scope.field_index,$scope.field_type,$scope.field_field,$scope.field_text, 
				function(response) {
					$scope.field_tokens = response;
					$scope.clearAlert();
				},
				function(error) {
					$scope.field_tokens = null;
					$scope.setAlert(new Alert(false, "Error while analyzing text", error));
				}
			);
		}
	}
	
	$scope.analyzeByAnalyzer=function() {
		if ($scope.analyzer_analyzer.length > 0 && $scope.analyzer_text.length > 0) {
			$scope.field_tokens = null;
			$scope.analyzer_tokens = $scope.client.analyzeByAnalyzer($scope.analyzer_index,$scope.analyzer_analyzer,$scope.analyzer_text,
				function(response) {
					$scope.field_tokens = response;
					$scope.clearAlert();
				},
				function(error) {
					$scope.field_tokens = null;
					$scope.setAlert(new Alert(false, "Error while analyzing text", error));
				}
			);
		}
	}
	
	$scope.getTypes=function() {
		if ($scope.cluster_state != null) {
			return $scope.cluster_state.getTypes($scope.field_index);
		}
	}
	
	$scope.getAnalyzers=function() {
		if ($scope.cluster_state != null) {
			return $scope.cluster_state.getAnalyzers($scope.analyzer_index);
		}
	}

	$scope.getFields=function() {
		if ($scope.cluster_state != null) {
			return $scope.cluster_state.getFields($scope.field_index,$scope.field_type);
		}
	}	
	
	$scope.$on('hostChanged',function() {
		$scope.loadAnalysisData();
	});
	
    $scope.$on('loadAnalysisEvent', function() {
		$scope.loadAnalysisData();
    });
	
	$scope.loadAnalysisData=function() {
		$scope.client.getClusterState(
			function(response) {
				var start = new Date().getTime();
				$scope.cluster_state = new ClusterState(response);
				$scope.indices = $scope.cluster_state.getIndices();
			},
			function(error) {
				$scope.setAlert(new Alert(false,"Error while reading analyzers information from cluster", error));
			}
		);
	}
}