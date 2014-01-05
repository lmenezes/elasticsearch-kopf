function PercolatorController($scope, $location, $timeout, ConfirmDialogService, AlertService) {
	$scope.alert_service = AlertService;
	$scope.dialog_service = ConfirmDialogService;
	
	$scope.editor = new AceEditor('percolator-query-editor');
		
	$scope.total = 0;
	$scope.queries = [];
	$scope.page = 1;
	$scope.filter = "";
	$scope.id = "";
	
	$scope.index;
	$scope.indices = [];
	$scope.new_query = new PercolateQuery("","","");
	
	
    $scope.$on('loadPercolatorEvent', function() {
		$scope.loadIndices();
		$scope.loadPercolatorQueries();
    });
	
	$scope.previousPage=function() {
		$scope.page -= 1;
		$scope.loadPercolatorQueries();
	}
	
	$scope.nextPage=function() {
		$scope.page += 1;
		$scope.loadPercolatorQueries();
	}
	
	$scope.hasNextPage=function() {
		return $scope.page * 10 < $scope.total;
	}
	
	$scope.hasPreviousPage=function() {
		return $scope.page > 1;
	}
	
	$scope.firstResult=function() {
		return $scope.total > 0 ? ($scope.page - 1) * 10  + 1 : 0;
	}
	
	$scope.lastResult=function() {
		return $scope.hasNextPage() ? $scope.page * 10 : $scope.total;
	}
	
	$scope.parseSearchParams=function() {
		var queries = [];
		if ($scope.id.trim().length > 0) {
			queries.push({"term":{"_id":$scope.id}});
		}
		if ($scope.filter.trim().length > 0) {
			var filter = JSON.parse($scope.filter);
			Object.keys(filter).forEach(function(field) {
				var q = {};
				q[field] = filter[field];
				queries.push({"term": q});
			});
		}
		return queries;
	}
	
	$scope.deletePercolatorQuery=function(query) {
		$scope.dialog_service.open(
			"are you sure you want to delete query " + query.id + " for index " + query.type + "?",
			query.sourceAsJSON(),
			"Delete",
			function() {
				$scope.client.deletePercolatorQuery(query.type, query.id,
					function(response) {
						$scope.client.refreshIndex("_percolator", 
							function(response) {
								$scope.alert_service.success("Query successfully deleted", response);
								$scope.loadPercolatorQueries();
							},
							function(error) {
								$scope.alert_service.success("Error while reloading queries", error);
							}
						);
					},
					function(error) {
						$scope.alert_service.error("Error while deleting query", error);
					}
				);
			}
		);
	}
	
	$scope.createNewQuery=function() {
		$scope.new_query.source = $scope.editor.format();
		if ($scope.editor.error == null) {
			$scope.client.createPercolatorQuery($scope.new_query.index.name, $scope.new_query.id, $scope.new_query.source,
				function(response) {
					$scope.client.refreshIndex("_percolator", 
						function(response) {
							// non request action, no need to display
							$scope.alert_service.success("Percolator Query successfully created", response);
							$scope.loadPercolatorQueries();
						},
						function(error) {
							$scope.alert_service.success("Error while reloading queries", error);
						}
					);
				},
				function(error) {
					$scope.alert_service.error("Error while creating percolator query", error);
				}
			);
		}
	}
	
	$scope.loadPercolatorQueries=function() {
		var params = {};
		try {
			var queries = $scope.parseSearchParams();
			if (queries.length > 0) {
				params['query'] = {"bool": {"must": queries}};
			}
			params['from'] = (($scope.page - 1) * 10);
			var index = $scope.index != null ? $scope.index.name : null;
			$scope.client.fetchPercolateQueries(index, JSON.stringify(params),
				function(response) {
					$scope.total = response['hits']['total'];
					$scope.queries = response['hits']['hits'].map(function(q) { return new PercolateQuery(q); });
				},
				function(error) {
					if (!(error['responseJSON'] != null && error['responseJSON']['error'] == "IndexMissingException[[_percolator] missing]")) {
						$scope.alert_service.error("Error while reading loading percolate queries", error);
					}
				}
			);
		} catch (error) {
			$scope.alert_service.error("Filter is not a valid JSON");
			return;
		}
	}
	
	$scope.loadIndices=function() {
		$scope.indices = $scope.cluster.indices.filter(function(index) { return index != '_percolator' });
	}
}

function PercolateQuery(query_info) {
	this.type = query_info['_type'];
	this.id = query_info['_id'];
	this.source = query_info['_source'];
	
	this.sourceAsJSON=function() {
		try {
			return JSON.stringify(this.source,undefined, 2);
		} catch (error) {

		}
	}
}