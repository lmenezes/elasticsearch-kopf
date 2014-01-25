function ClusterSettingsController($scope, $location, $timeout, AlertService) {
	$scope.alert_service = AlertService;

	$scope.back=function() {
		$('#cluster_option a').tab('show');
	};
	
    $scope.$on('loadClusterSettingsEvent', function() {
		$('#cluster_settings_option a').tab('show');
		$('#cluster_settings_tabs a:first').tab('show');
		$(".setting-info").popover();
		$scope.settings = new ClusterSettings($scope.cluster.settings);
    });

	$scope.save=function() {
			var new_settings = {};
			new_settings.transient = $scope.settings;
			var response = $scope.client.updateClusterSettings(JSON.stringify(new_settings, undefined, ""),
				function(response) {
					$scope.updateModel(function() {
						$scope.alert_service.success("Cluster settings were successfully updated",response);
					});
					$scope.refreshClusterState();
				}, 
				function(error) {
					$scope.updateModel(function() {
						$scope.alert_service.error("Error while updating cluster settings",error);
					});
				}
		);
	};
}