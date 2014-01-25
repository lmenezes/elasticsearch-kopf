function IndexSettingsController($scope, $location, $timeout, IndexSettingsService, AlertService) {
	$scope.alert_service = AlertService;
	$scope.service = IndexSettingsService;
	
	$scope.back=function() {
		$('#cluster_option a').tab('show');
	};

	$scope.save=function() {
		var index = $scope.service.index;
		var new_settings = {};
		index.settings.valid_settings.forEach(function(setting) {
			if (notEmpty(index.settings[setting])) {
				new_settings[setting] = index.settings[setting];
			}
		});
		$scope.client.updateIndexSettings(index.name, JSON.stringify(new_settings, undefined, ""),
			function(response) {
				$scope.updateModel(function() {
					$scope.alert_service.success("Index settings were successfully updated", response);
				});
				$scope.refreshClusterState();
			},
			function(error) {
				$scope.updateModel(function() {
					$scope.alert_service.error("Error while updating index settings", error);
				});
			}
		);
	};
 }