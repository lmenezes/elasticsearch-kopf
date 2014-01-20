function NavbarController($scope, $location, $timeout, AlertService, SettingsService) {
	$scope.settings_service = SettingsService;
	$scope.alert_service = AlertService;
	$scope.new_refresh = $scope.settings_service.getRefreshInterval();
	
    $scope.connectToHost=function() {
		if (isDefined($scope.new_host) && $scope.new_host.length > 0) {
			$scope.setHost($scope.new_host);
			$scope.cluster_health = null;
			$scope.refreshClusterState();
		}
	};
	
	$scope.changeRefresh=function() {
		$scope.settings_service.setRefreshInterval($scope.new_refresh);
	};

}
