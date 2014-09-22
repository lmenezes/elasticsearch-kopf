kopf.controller('NavbarController', ['$scope', 'SettingsService', 'ThemeService', 'ElasticService', function($scope, SettingsService, ThemeService, ElasticService) {

    $scope.new_refresh = SettingsService.getRefreshInterval();
    $scope.theme = ThemeService.getTheme();
    $scope.new_host = '';

    $scope.connectToHost = function (event) {
        if (event.keyCode == 13 && notEmpty($scope.new_host)) {
            ElasticService.connect($scope.new_host);
            $scope.refreshClusterState();
        }
    };
	
	$scope.changeRefresh=function() {
        SettingsService.setRefreshInterval($scope.new_refresh);
	};
	
	$scope.changeTheme=function() {
		ThemeService.setTheme($scope.theme);
	};

}]);
