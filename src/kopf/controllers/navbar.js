kopf.controller('NavbarController', ['$scope', '$location', '$timeout', 'AlertService', 'SettingsService', 'ThemeService', function($scope, $location, $timeout, AlertService, SettingsService, ThemeService) {
	$scope.new_refresh = SettingsService.getRefreshInterval();
	$scope.theme = ThemeService.getTheme();
	
    $scope.connectToHost=function(event) {
		if (event.keyCode == 13) {
			if (isDefined($scope.new_host) && $scope.new_host.length > 0) {
				$scope.setHost($scope.new_host);
				$scope.refreshClusterState();
			}			
		}
	};
	
	$scope.changeRefresh=function() {
        SettingsService.setRefreshInterval($scope.new_refresh);
	};
	
	$scope.changeTheme=function() {
		ThemeService.setTheme($scope.theme);
	};

}]);
