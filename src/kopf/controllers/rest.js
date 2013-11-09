function RestController($scope, $location, $timeout) {
	$scope.editor = ace.edit("rest-client-editor");
	$scope.editor.setFontSize("10px");
	$scope.editor.setTheme("ace/theme/kopf");
	$scope.editor.getSession().setMode("ace/mode/json");
	
	$scope.request = new Request($scope.getHost() + "/_search","GET","{}");
	$scope.validation_error = null;
	$scope.history = [];
	$scope.history_request = null;
	
	$scope.updateEditor=function() {
		$scope.editor.setValue($scope.request.body,1);
		$scope.editor.gotoLine(0,0,false);
	}
	
	$scope.formatBody=function() {
		var query = $scope.editor.getValue();
		try {
			if (notEmpty(query)) {
				$scope.validation_error = null;
				var bodyObject = JSON.parse(query);
				var formattedBody = JSON.stringify(bodyObject,undefined,4);
				$scope.editor.setValue(formattedBody,0);
				$scope.editor.gotoLine(0,0,false);
				$scope.request.body = formattedBody;
			}
		} catch (error) {
			$scope.validation_error = error.toString();
		}
	}
	
	$scope.loadHistoryRequest=function() {
		$scope.request.url = $scope.history_request.url;
		$scope.request.body = $scope.history_request.body;
		$scope.request.method = $scope.history_request.method;
		$scope.updateEditor();
		$scope.history_request = null;
	}
	
	$scope.sendRequest=function() {
		$scope.formatBody();
		$scope.clearAlert();
		$('#rest-client-response').html('');
		if ($scope.validation_error == null && notEmpty($scope.request.url)) {
			try {
				// TODO: deal with basic auth here
				if ($scope.request.method == 'GET' && $scope.request.body.length > 1) {
					$scope.setAlert(new InfoAlert("You are executing a GET request with body content. Maybe you meant to use POST or PUT?"));
				}
				$scope.client.executeRequest($scope.request.method,$scope.request.url,null,null,$scope.request.body,
					function(response) {
						var content = jsonTree.create(response);
						$('#rest-client-response').html(content);
						$scope.history.push(new Request($scope.request.url,$scope.request.method,$scope.request.body));	
					},
					function(error) {
						try {
							var content = jsonTree.create(JSON.parse(error));
							$('#rest-client-response').html(content);
						} catch (invalid_json) {
							$scope.setAlert(new ErrorAlert("Request did not return a valid JSON", error));
						}
					}
				);
			} catch (error) {
				$scope.setAlert(new ErrorAlert("Error while executing request", error));
			}
		}
	}
	// maybe allow storing queries in ES? would need some kind of security
	$scope.templates = [
		{'key':"search + filter + facets + highlight + sort",'value':JSON.stringify(JSON.parse('{ "query" : { "term" : { "field" : "value" } }, "filter" : { "term" : { "field_name" : "value" } }, "facets" : { "facet_name" : { "terms" : { "field" : "field_name" } } }, "sort" : [ { "field_name" : {"order" : "asc"} } ], "highlight" : { "fields" : { "field_name" : {"fragment_size" : 150, "number_of_fragments" : 3} } }, "from" : 0, "size" : 10 }'), undefined, 4)},
		{'key':"bool query",'value':JSON.stringify(JSON.parse('{"query" : { "bool" : { "must" : { "term" : { "field" : "value" } }, "must_not" : { "term" : { "field" : "value" } }, "should" : [ {"term" : { "field" : "value" }} ], "minimum_should_match" : 1, "boost" : 1.0 } } }'), undefined, 4)},
		{'key':"range query",'value':JSON.stringify(JSON.parse('{"query": { "range" : { "field_name" : { "from" : 10, "to" : 20, "include_lower" : true, "include_upper": false, "boost" : 2.0 } } } }'), undefined, 4)},
		{'key':"ids query",'value':JSON.stringify(JSON.parse('{"query": { "ids" : { "type" : "document_type", "values" : ["1", "2","3"] } } }'), undefined, 4)},
		{'key':"range query",'value':JSON.stringify(JSON.parse('{"query": { "range" : { "field_name" : { "from" : 10, "to" : 20, "include_lower" : true, "include_upper": false, "boost" : 2.0 } } } }'), undefined, 4)},
	];
}