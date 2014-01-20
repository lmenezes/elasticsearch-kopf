function AnalysisController($scope, $location, $timeout, AlertService) {
	$scope.indices = null;
	$scope.alert_service = AlertService;

	// by index
	$scope.field_index = null;
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
			$scope.client.analyzeByField($scope.field_index.name,$scope.field_type,$scope.field_field,$scope.field_text, 
				function(response) {
					$scope.updateModel(function() {
						$scope.field_tokens = response;
					});
				},
				function(error) {
					$scope.updateModel(function() {
						$scope.field_tokens = null;
						$scope.alert_service.error("Error while analyzing text", error);
					});
				}
			);
		}
	};
	
	$scope.analyzeByAnalyzer=function() {
		if ($scope.analyzer_analyzer.length > 0 && $scope.analyzer_text.length > 0) {
			$scope.field_tokens = null;
			$scope.analyzer_tokens = $scope.client.analyzeByAnalyzer($scope.analyzer_index.name,$scope.analyzer_analyzer,$scope.analyzer_text,
				function(response) {
					$scope.updateModel(function() {
						$scope.field_tokens = response;
					});
				},
				function(error) {
					$scope.updateModel(function() {
						$scope.field_tokens = null;
						$scope.alert_service.error("Error while analyzing text", error);
					});
				}
			);
		}
	};
	
	$scope.$on('hostChanged',function() {
		$scope.indices = $scope.cluster.indices;
	});
	
    $scope.$on('loadAnalysisEvent', function() {
		$scope.indices = $scope.cluster.indices;
    });
	
}