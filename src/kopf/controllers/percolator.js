function PercolatorController($scope, $location, $timeout) {
	$scope.total = 0;
	$scope.queries = [];
	$scope.page = 1;
	$scope.filter = "";
	$scope.id = "";
	
	$scope.index;
	$scope.indices = [];
	$scope.new_query = new PercolateQuery("","","");
	
	
    $scope.$on('loadPercolatorEvent', function() {
		$scope.loadPercolatorQueries();
		$scope.loadIndices();
    });
	
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
	
	$scope.deletePercolatorQuery=function(type, id) {
		console.log($scope.queries);
		$scope.client.deletePercolatorQuery(type, id,
			function(response) {
				$scope.setAlert(new Alert(true,"Query successfully deleted", response));
				$scope.queries = $scope.queries.filter(function(q) { 
					return q.id != id || q.type != type; 
					}
				);
			},
			function(error) {
				$scope.setAlert(new Alert(false,"Error while deleting query", error));
			}
		);
	}
	
	$scope.loadPercolatorQueries=function() {
		var params = {};
		try {
			var queries = $scope.parseSearchParams();
			if (queries.length > 0) {
				params['query'] = {"bool": {"must": queries}};
			}
			params['from'] = (($scope.page - 1) * 10);
			$scope.client.fetchPercolateQueries($scope.index, JSON.stringify(params),
				function(response) {
					$scope.total = response['hits']['total'];
					$scope.queries = response['hits']['hits'].map(function(q) { return new PercolateQuery(q); });
				},
				function(error) {
					$scope.setAlert(new Alert(false,"Error while reading loading percolate queries", error));
				}
			);
		} catch (error) {
			$scope.setAlert(new Alert(false,"Filter is not a valid JSON"));
			return;
		}
	}
	
	$scope.loadIndices=function() {
		$scope.client.getClusterState(
			function(response) {
				$scope.indices = new ClusterState(response).getIndices().filter(function(index) { return index != '_percolator' });
			},
			function(error) {
				$scope.setAlert(new Alert(false,"Error while reading loading cluster state", error));
			}
		);
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