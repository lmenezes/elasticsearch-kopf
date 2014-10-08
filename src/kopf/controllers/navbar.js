kopf.controller('NavbarController', ['$scope', 'SettingsService', 'ThemeService', 'ElasticService', 'AlertService', 'HostHistoryService', function($scope, SettingsService, ThemeService, ElasticService, AlertService, HostHistoryService) {

    $scope.new_refresh = SettingsService.getRefreshInterval();
    $scope.theme = ThemeService.getTheme();
    $scope.new_host = '';
    $scope.current_host = ElasticService.getHost();
    $scope.auto_adjust_layout = SettingsService.getAutoAdjustLayout();
    $scope.host_history = HostHistoryService.getHostHistory();

    $scope.handleConnectToHost= function (event) {
        if (event.keyCode == 13 && notEmpty($scope.new_host)) {
            $scope.connectToHost($scope.new_host);
        }
    };

    $scope.connectToHost=function(host) {
        try {
            ElasticService.connect(host);
            HostHistoryService.addToHistory(ElasticService.connection.host);
            $scope.host_history = HostHistoryService.getHostHistory();
        } catch(error) {
            AlertService.error("Error while connecting to new target host", error);
        } finally {
            $scope.current_host = ElasticService.connection.host;
            $scope.refreshClusterState();
        }
    };

	$scope.changeRefresh=function() {
        SettingsService.setRefreshInterval($scope.new_refresh);
	};
	
	$scope.changeTheme=function() {
		ThemeService.setTheme($scope.theme);
	};

    $scope.setAutoAdjustLayout=function() {
        SettingsService.setAutoAdjustLayout($scope.auto_adjust_layout);
    };

}]);
