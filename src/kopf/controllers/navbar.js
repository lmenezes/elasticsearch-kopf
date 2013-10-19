function NavbarController($scope, $location, $timeout) {
	
	$scope.new_refresh = $scope.getRefresh();
	$scope.cluster_health = null;
	
	(function loadClusterHealth() {
		
		$scope.updateClusterHealth=function() {
			$scope.client.getClusterHealth( 
				function(cluster) {
					if ($scope.cluster_health == null) {
						$scope.clearAlert();
					}
					$scope.cluster_health = cluster;
					$scope.setConnected(true);
				},
				function(error_response) {
					$scope.cluster_health = null;
					$scope.setConnected(false);
					$scope.alert = new Alert(false, "Error connecting to [" + $scope.host + "]",error_response);
				}
			);
		}
		
    	$timeout(loadClusterHealth, $scope.refresh);
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
		$scope.setRefresh($scope.new_refresh);
	}

	$scope.selectTab=function(event) {
		$scope.clearAlert();
		if (isDefined(event)) {
			$scope.broadcastMessage(event, {});
		}
	}
}
