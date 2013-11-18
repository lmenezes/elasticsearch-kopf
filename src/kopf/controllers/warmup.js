function WarmupController($scope, $location, $timeout, ConfirmDialogService, ClusterSettingsService) {
	
	$scope.dialog_service = ConfirmDialogService;
	$scope.cluster_service = ClusterSettingsService;
	
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
	}
	
	$scope.loadIndices=function() {
		$scope.client.getClusterState(
			function(response) {
				$scope.indices = new ClusterState(response).getIndices().filter(function(index) { return index != '_percolator' });
			},
			function(error) {
				$scope.setAlert(new ErrorAlert("Error while reading indices from cluster", error));
			}
		);
	}
	
	$scope.createWarmerQuery=function() {
		$scope.formatBody();
		$scope.clearAlert();
		if ($scope.validation_error == null) {
			$scope.client.registerWarmupQuery($scope.new_index, $scope.new_types, $scope.new_warmer_id, $scope.new_source,
				function(response) {
					$scope.setAlert(new SuccessAlert("Warmup query successfully registered", response));
				},
				function(error) {
					$scope.setAlert(new ErrorAlert("Request did not return a valid JSON", error));
				}
			);
		}
	}
	
	$scope.deleteWarmupQuery=function(warmer_id, source) {
		$scope.dialog_service.open(
			"are you sure you want to delete query " + warmer_id + "?",
			source,
			"Delete",
			function() {
				$scope.client.deleteWarmupQuery($scope.index, warmer_id,
					function(response) {
						$scope.setAlert(new SuccessAlert("Warmup query successfully deleted", response));
						$scope.loadIndexWarmers();
					},
					function(error) {
						$scope.setAlert(new ErrorAlert("Error while deleting warmup query", error));
					}
				);
			}
		);
	}
	
	$scope.loadIndexWarmers=function() {
		if ($scope.index != null) {
			$scope.client.getIndexWarmers($scope.index, $scope.warmer_id,
				function(response) {
					if (response[$scope.index] != null) {
						$scope.warmers = response[$scope.index]['warmers'];
					} else {
						$scope.warmers = {};
					}
				},
				function(error) {
					$scope.setAlert(new ErrorAlert("Error while fetching warmup queries", error));
				}
			);
		} else {
			$scope.warmers = {};
		}
	}
	
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
	}
	
}