function CreateIndexController($scope, $location, $timeout, AlertService) {
	$scope.alert_service = AlertService;
	$scope.settings = '';
	$scope.shards = '';
	$scope.replicas = '';
	$scope.name = '';

	$scope.editor = new AceEditor('index-settings-editor');
	
	$scope.back=function() {
		$('#cluster_option a').tab('show');
	}
	
    $scope.$on('loadCreateIndex', function() {
		$('#create_index_option a').tab('show');
		$scope.prepareCreateIndex();
    });

	$scope.createIndex=function() {
		if ($scope.name.trim().length == 0) {
			AlertService.error("You must specify a valid index name", null);	
		} else {
			var settings = {};
			var content = $scope.editor.getValue();
			if (content.trim().length > 0) {
				try {
					settings = JSON.parse(content);
				} catch (error) {
					throw "Invalid JSON: " + error;
				}
			} 
			if (!isDefined(settings['settings'])) {
				settings = {"settings":settings};
			} 
			if (!isDefined(settings['settings']['index'])) {
				settings['settings']['index'] = {};
			} 
			var index_settings = settings['settings']['index'];
			if ($scope.shards.trim().length > 0) {
				index_settings['number_of_shards'] = $scope.shards;
			}
			if ($scope.replicas.trim().length > 0) {
				index_settings['number_of_replicas'] = $scope.replicas;
			}
			$scope.client.createIndex($scope.name, JSON.stringify(settings, undefined, ""), 
				function(response) {
	   				$scope.updateModel(function() {
						AlertService.success('Index successfully created', response);
	   				});
					$scope.refreshClusterState();
				}, function(error) { 
	   				$scope.updateModel(function() {
						AlertService.error("Error while creating index", error);
	   				});
				}
			);
		}
	}
	
	$scope.prepareCreateIndex=function() {
		$scope.settings = "";
		$scope.editor.setValue("{}");
		$scope.shards = '';
		$scope.name = '';
		$scope.replicas = '';
	}
}