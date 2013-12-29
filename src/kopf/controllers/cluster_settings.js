function ClusterSettingsController($scope, $location, $timeout, ClusterSettingsService, AlertService) {
	$scope.alert_service = AlertService;
	$scope.cluster_service = ClusterSettingsService;

	$scope.back=function() {
		$('#cluster_option a').tab('show');
	}
	
    $scope.$on('loadClusterSettingsEvent', function() {
		$('#cluster_settings_option a').tab('show');
		$('#cluster_settings_tabs a:first').tab('show');
		$scope.settings = $scope.cluster_service.cluster.settings;
    });

	$scope.save=function() {
			var new_settings = {};
			new_settings['transient'] = $scope.settings;
			var response = $scope.client.updateClusterSettings(JSON.stringify(new_settings, undefined, ""),
				function(response) {
					$scope.alert_service.success("Cluster settings were successfully updated",response);
					$scope.forceRefresh();
				}, 
				function(error) {
					$scope.alert_service.error("Error while updating cluster settings",error);
				}
		);
	}
}