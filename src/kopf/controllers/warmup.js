function WarmupController($scope, $location, $timeout, ConfirmDialogService, AlertService, AceEditorService) {
	$scope.editor = undefined;
	$scope.indices = [];
	$scope.index = null;
	$scope.pagination = new WarmersPagination(1, []);
	
	// holds data for new warmer. maybe create a model for that
	$scope.warmer = new Warmer('', '', { types: [], source: {} });

	$scope.$on('loadWarmupEvent', function() {
		$scope.loadIndices();
		$scope.initEditor();
	});
	
	$scope.initEditor=function(){
		if(!angular.isDefined($scope.editor)){
			$scope.editor = AceEditorService.init('warmup-query-editor');
		}
	};

	$scope.totalWarmers=function() {
		return $scope.pagination.total();
	};
	
	$scope.loadIndices=function() {
		$scope.indices = $scope.cluster.indices;
	};
	
	$scope.createWarmerQuery=function() {
		if ($scope.editor.hasContent()) {
			$scope.editor.format();
			if (!isDefined($scope.editor.error)) {
                $scope.warmer.source = $scope.editor.getValue();
				$scope.client.registerWarmupQuery($scope.warmer,
					function(response) {
						$scope.updateModel(function() {
							$scope.loadIndexWarmers();
							AlertService.success("Warmup query successfully registered", response);
						});
					},
					function(error) {
						$scope.updateModel(function() {
							AlertService.error("Request did not return a valid JSON", error);
						});
					}
				);
			}
		} else {
			AlertService.error("Warmup query body can't be empty");
		}
	};
	
	$scope.deleteWarmupQuery=function(warmer) {
		ConfirmDialogService.open(
			"are you sure you want to delete query " + warmer.id + "?",
			warmer.source,
			"Delete",
			function() {
				$scope.client.deleteWarmupQuery(warmer,
					function(response) {
						$scope.updateModel(function() {
							AlertService.success("Warmup query successfully deleted", response);
							$scope.loadIndexWarmers();
						});
					},
					function(error) {
						$scope.updateModel(function() {
							AlertService.error("Error while deleting warmup query", error);
						});
					}
				);
			}
		);
	};
	
	$scope.loadIndexWarmers=function() {
		if (isDefined($scope.index)) {
			$scope.client.getIndexWarmers($scope.index, $scope.pagination.warmer_id,
				function(warmers) {
					$scope.updateModel(function() {
                        $scope.pagination.setResults(warmers);
					});
				},
				function(error) {
					$scope.updateModel(function() {
                        $scope.pagination.setResults([]);
						AlertService.error("Error while fetching warmup queries", error);
					});
				}
			);
		} else {
			$scope.pagination.setResults([]);
		}
	};
	
}