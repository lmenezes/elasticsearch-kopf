function NavbarController($scope, $location, $timeout, AlertService, SettingsService) {
	$scope.settings_service = SettingsService;
	$scope.alert_service = AlertService;
	$scope.new_refresh = $scope.settings_service.getRefreshInterval();
	$scope.cluster_health = null;
	
	(function loadClusterHealth() {
		
		$scope.updateClusterHealth=function() {
			$scope.client.getClusterHealth( 
				function(cluster) {
					$scope.cluster_health = cluster;
					$scope.setConnected(true);
				},
				function(error) {
					$scope.cluster_health = null;
					$scope.setConnected(false);
					$scope.alert_service.error("Error connecting to [" + $scope.host + "]",error);
				}
			);
		}
		
    	$timeout(loadClusterHealth, $scope.settings_service.getRefreshInterval());
		$scope.updateClusterHealth();
	}());
	
    $scope.$on('forceRefresh', function() {
		$scope.updateClusterHealth();
    });
	
    $scope.connectToHost=function() {
		if (isDefined($scope.new_host) && $scope.new_host.length > 0) {
			$scope.setHost($scope.new_host);
			$scope.cluster_health = null;
			$scope.updateClusterHealth();
		}
	}
	
	$scope.changeRefresh=function() {
		$scope.settings_service.setRefreshInterval($scope.new_refresh);
	}

	$scope.selectTab=function(event) {
		$scope.alert_service.clear();
		if (isDefined(event)) {
			$scope.broadcastMessage(event, {});
		}
	}
}
