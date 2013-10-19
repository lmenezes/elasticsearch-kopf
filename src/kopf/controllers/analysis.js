function AnalysisController($scope, $location, $timeout) {
	$scope.indices = {};

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
		if (isDefined($scope.indices[$scope.field_index])) {
			return $scope.indices[$scope.field_index]['types'];
		}
	}
	
	$scope.getAnalyzers=function() {
		if (isDefined($scope.indices[$scope.analyzer_index])) {
			return $scope.indices[$scope.analyzer_index]['analyzers'];
		}
	}

	$scope.getFields=function() {
		if (isDefined($scope.indices[$scope.field_index])) {
			return $scope.indices[$scope.field_index]['types'][$scope.field_type];
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
				Object.keys(response['metadata']['indices']).forEach(function(index) {
					$scope.indices[index] = {};
					var indexData = response['metadata']['indices'][index]['mappings'];
					$scope.indices[index]['types'] = {};
					Object.keys(indexData).forEach(function(type) {
						$scope.indices[index]['types'][type] = [];
						Object.keys(indexData[type]['properties']).forEach(function(property) {
							$scope.indices[index]['types'][type].push(property);
						});
					});
					var indexSettings = response['metadata']['indices'][index]['settings'];
					$scope.indices[index]['analyzers'] = [];
					Object.keys(indexSettings).forEach(function(setting) {
						if (setting.indexOf('index.analysis.analyzer') == 0) {
							var analyzer = setting.substring('index.analysis.analyzer.'.length);
							analyzer = analyzer.substring(0,analyzer.indexOf("."));
							if ($.inArray(analyzer, $scope.indices[index]['analyzers']) == -1) {
								$scope.indices[index]['analyzers'].push(analyzer);
							}
						}
					});
				});
			},
			function(error) {
				$scope.setAlert(new Alert(false,"Error while reading analyzers information from cluster", error));
			}
		);
	}
}