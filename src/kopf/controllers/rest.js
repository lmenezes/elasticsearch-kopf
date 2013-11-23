function RestController($scope, $location, $timeout, AlertService) {
	$scope.alert_service = AlertService;
	
	$scope.request = new Request($scope.getHost() + "/_search","GET","{}");
	$scope.validation_error = null;
	$scope.history = [];
	$scope.history_request = null;
		
	$scope.editor = new AceEditor('rest-client-editor');
	$scope.editor.setValue($scope.request.body);
	
	$scope.loadFromHistory=function(history_request) {
		$scope.request.url = history_request.url;
		$scope.request.body = history_request.body;
		$scope.request.method = history_request.method;
		$scope.editor.setValue(history_request.body);
		$scope.history_request = null;
	}

	$scope.sendRequest=function() {
		$scope.request.body = $scope.editor.format();
		$('#rest-client-response').html('');
		if ($scope.editor.error == null && notEmpty($scope.request.url)) {
			try {
				// TODO: deal with basic auth here
				if ($scope.request.method == 'GET' && $scope.request.body.length > 1) {
					$scope.alert_service.info("You are executing a GET request with body content. Maybe you meant to use POST or PUT?");
				}
				$scope.client.executeRequest($scope.request.method,$scope.request.url,null,null,$scope.request.body,
					function(response) {
						var content = jsonTree.create(response);
						$('#rest-client-response').html(content);
						$scope.history.unshift(new Request($scope.request.url,$scope.request.method,$scope.request.body));
						if ($scope.history.length > 30) {
							$scope.history.length = 30;
						}
					},
					function(error) {
						try {
							$('#rest-client-response').html(jsonTree.create(JSON.parse(error)));
						} catch (invalid_json) {
							$scope.alert_service.error("Request did not return a valid JSON", invalid_json);
						}
					}
				);
			} catch (error) {
				$scope.alert_service.error("Error while executing request", error);
			}
		}
	}
}