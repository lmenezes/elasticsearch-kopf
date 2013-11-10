function ClusterSettingsController($scope, $location, $timeout, ClusterSettingsService) {
	$scope.cluster_service = ClusterSettingsService;

	$scope.back=function() {
		$('#cluster_option a').tab('show');
	}

	$scope.save=function() {
			var new_settings = {};
			new_settings['transient'] = $scope.cluster_service.cluster.settings;
			var response = $scope.client.updateClusterSettings(JSON.stringify(new_settings, undefined, ""),
				function(response) {
					$scope.setAlert(new SuccessAlert("Cluster settings were successfully updated",response));
					$scope.broadcastMessage('forceRefresh', {});
				}, 
				function(error) {
					$scope.setAlert(new ErrorAlert("Error while updating cluster settings",error));
				}
		);
	}
}