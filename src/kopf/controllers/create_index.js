function CreateIndexController($scope, $location, $timeout) {
	$scope.settings = '';
	$scope.shards = '';
	$scope.replicas = '';
	$scope.name = '';
	$scope.editor = ace.edit("index-settings-editor");
	$scope.editor.setFontSize("10px");
	$scope.editor.setTheme("ace/theme/kopf");
	$scope.editor.getSession().setMode("ace/mode/json");
	
	$scope.updateEditor=function() {
		$scope.editor.setValue($scope.settings,1);
		$scope.editor.gotoLine(0,0,false);
	}
	
    $scope.$on('prepareCreateIndex', function() {
		$scope.prepareCreateIndex();
    });

	$scope.createIndex=function() {
		if ($scope.name.trim().length == 0) {
			$scope.modal.alert = new ErrorAlert("You must specify a valid index name", null);	
		} else {
			var settings = {};
			var editor_content = $scope.editor.getValue();
			if (editor_content.trim().length > 0) {
				try {
					settings = JSON.parse(editor_content);
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
			if (!isDefined(index_settings['number_of_shards']) && $scope.shards.length > 0) {
				index_settings['number_of_shards'] = $scope.shards;
			}
			if (!isDefined(index_settings['number_of_replicas']) && $scope.replicas.length > 0) {
				index_settings['number_of_replicas'] = $scope.replicas;
			}
			$scope.client.createIndex($scope.name, JSON.stringify(settings, undefined, ""), 
				function(response) {
					$scope.modal.alert = new SuccessAlert('Index successfully created', response);
					$scope.broadcastMessage('forceRefresh', {});					
				}, function(error) { 
					$scope.modal.alert = new ErrorAlert("Error while creating index", error);
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