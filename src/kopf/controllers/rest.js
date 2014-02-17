function RestController($scope, $location, $timeout, AlertService, AceEditorService) {
	
	$scope.request = new Request($scope.connection.host + "/_search","GET","{}");
	$scope.validation_error = null;

	$scope.loadHistory=function() {
		var history = [];
		if (isDefined(localStorage.kopf_request_history)) {
			try {
				history = JSON.parse(localStorage.kopf_request_history).map(function(h) {
					return new Request().loadFromJSON(h);
				});
			} catch (error) {
				localStorage.kopf_request_history = null;
			}
		}
		return history;
	};
	
	$scope.history = $scope.loadHistory();
	$scope.history_request = null;

	if(!angular.isDefined($scope.editor)){
		$scope.editor = AceEditorService.init('rest-client-editor');
	}

	$scope.editor.setValue($scope.request.body);

	$scope.loadFromHistory=function(history_request) {
		$scope.request.url = history_request.url;
		$scope.request.body = history_request.body;
		$scope.request.method = history_request.method;
		$scope.editor.setValue(history_request.body);
		$scope.history_request = null;
	};

	$scope.addToHistory=function(history_request) {
		var exists = false;
		for (var i = 0; i < $scope.history.length; i++) {
			if ($scope.history[i].equals(history_request)) {
				exists = true;
				break;
			}
		}
		if (!exists) {
			$scope.history.unshift(history_request);
			if ($scope.history.length > 30) {
				$scope.history.length = 30;
			}
			localStorage.kopf_request_history = JSON.stringify($scope.history);
		}
	};

	$scope.sendRequest=function() {
		$scope.request.body = $scope.editor.format();
		$('#rest-client-response').html('');
		if (!isDefined($scope.editor.error) && notEmpty($scope.request.url)) {
			// TODO: deal with basic auth here
			if ($scope.request.method == 'GET' && '{}' !== $scope.request.body) {
				AlertService.info("You are executing a GET request with body content. Maybe you meant to use POST or PUT?");
			}
			$scope.client.executeRequest($scope.request.method,$scope.request.url,null,null,$scope.request.body,
				function(response) {
					var content = response;
					try {
						content = JSONTree.create(response);
					} catch (parsing_error) {
						// nothing to do
					}
					$('#rest-client-response').html(content);
					$scope.updateModel(function() {
						$scope.addToHistory(new Request($scope.request.url,$scope.request.method,$scope.request.body));
					});

				},
				function(error) {
					$scope.updateModel(function() {
						if (error.status !== 0) {
							AlertService.error("Request was not successful: " + error.statusText);
						} else {
							AlertService.error($scope.request.url + " is unreachable");
						}
					});
					try {
						$('#rest-client-response').html(JSONTree.create(JSON.parse(error.responseText)));
					} catch (invalid_json) {
						$('#rest-client-response').html(error.responseText);
					}
				}
			);
		}
	};
}