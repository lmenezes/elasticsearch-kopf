function WarmupController($scope, $location, $timeout, ConfirmDialogService, AlertService) {
	$scope.alert_service = AlertService;	
	$scope.dialog_service = ConfirmDialogService;
	
	$scope.editor = ace.edit("warmup-query-editor");
	$scope.editor.setFontSize("10px");
	$scope.editor.setTheme("ace/theme/kopf");
	$scope.editor.getSession().setMode("ace/mode/json");

	$scope.indices = [];
	$scope.warmers = {};
	$scope.index = null;
	$scope.warmer_id = "";
	
	// holds data for new warmer. maybe create a model for that
	$scope.new_warmer_id = '';
	$scope.new_index = '';
	$scope.new_source = '';
	$scope.new_types = '';
	
    $scope.$on('loadWarmupEvent', function() {
		$scope.loadIndices();
    });
	
	$scope.totalWarmers=function() {
		return Object.keys($scope.warmers).length;
	};
	
	$scope.loadIndices=function() {
		$scope.indices = $scope.cluster.indices;
	};
	
	$scope.createWarmerQuery=function() {
		$scope.formatBody();
		if (!isDefined($scope.validation_error)) {
			$scope.client.registerWarmupQuery($scope.new_index.name, $scope.new_types, $scope.new_warmer_id, $scope.new_source,
				function(response) {
					$scope.updateModel(function() {
						$scope.alert_service.success("Warmup query successfully registered", response);						
					});
				},
				function(error) {
					$scope.updateModel(function() {
						$scope.alert_service.error("Request did not return a valid JSON", error);						
					});
				}
			);
		}
	};
	
	$scope.deleteWarmupQuery=function(warmer_id, source) {
		$scope.dialog_service.open(
			"are you sure you want to delete query " + warmer_id + "?",
			source,
			"Delete",
			function() {
				$scope.client.deleteWarmupQuery($scope.index.name, warmer_id,
					function(response) {
						$scope.updateModel(function() {
							$scope.alert_service.success("Warmup query successfully deleted", response);
							$scope.loadIndexWarmers();
						});
					},
					function(error) {
						$scope.updateModel(function() {
							$scope.alert_service.error("Error while deleting warmup query", error);
						});
					}
				);
			}
		);
	};
	
	$scope.loadIndexWarmers=function() {
		if (isDefined($scope.index)) {
			$scope.client.getIndexWarmers($scope.index.name, $scope.warmer_id,
				function(response) {
					$scope.updateModel(function() {
						if (isDefined(response[$scope.index.name])) {
							$scope.warmers = response[$scope.index.name].warmers;
						} else {
							$scope.warmers = {};
						}
					});
				},
				function(error) {
					$scope.updateModel(function() {
						$scope.alert_service.error("Error while fetching warmup queries", error);
					});
				}
			);
		} else {
			$scope.warmers = {};
		}
	};
	
	$scope.formatBody=function() {
		var source = $scope.editor.getValue();
		try {
			$scope.validation_error = null;
			var sourceObj = JSON.parse(source);
			var formattedSource = JSON.stringify(sourceObj,undefined,4);
			$scope.editor.setValue(formattedSource,0);
			$scope.editor.gotoLine(0,0,false);
			$scope.new_source = formattedSource;
		} catch (error) {
			$scope.validation_error = error.toString();
		}
	};
	
}