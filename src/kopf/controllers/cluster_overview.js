function ClusterOverviewController($scope, $location, $timeout) {
	$scope.pagination= new Pagination(1,"", []);
	$scope.cluster = null;
	
	(function loadClusterState() {
		
		$scope.isCurrentView=function() {
			return ($("#cluster_option").length > 0) ? $scope.isActive('cluster_option') : true;
		}
		
		$scope.updateCluster=function(is_forced_refresh) {
			if ($scope.hasConnection()) {
				var forced_refresh = is_forced_refresh;
				if (!$scope.isInModal()) { // only refreshes if no modal is active
					if ($scope.isCurrentView()) {
						$scope.client.getClusterDetail(function(cluster) {
							if (!$scope.isInModal()) {
								$scope.$apply(function() { // forces view refresh
									$scope.cluster = cluster;
									$scope.pagination.setResults(cluster.indices);
								});
								forced_refresh = false;
							} else {
								if (forced_refresh) {
									$scope.forcedRefresh();
								}
							}
						},
						function(error) {
							// alert?
						}
					);
					} else {
						if (forced_refresh) {
							$scope.forcedRefresh();
						}
					}
				} else {
					if (forced_refresh) {
						$scope.forcedRefresh();
					}
				}
			}
		}
		$timeout(loadClusterState, $scope.getRefresh());	
		$scope.updateCluster(false);
	}());
	
	
	$scope.getNodes=function() {
		if ($scope.cluster != null) {
			return $scope.cluster.getNodes($scope.pagination.data,$scope.pagination.master,$scope.pagination.client);	
		}
	}
	
    $scope.$on('forceRefresh', function() {
		$scope.forcedRefresh();
    });
	
	// not to mistake with forceRefresh, which invokes a global refresh
	$scope.forcedRefresh=function() {
		$timeout(function() { $scope.updateCluster(true) }, 100);
	}
	
	$scope.closeModal=function(forced_refresh){
		$scope.modal.alert = null;
		if (forced_refresh) {
			$scope.forceRefresh(); // broadcasts so every controller gets the forceRefresg
		}
	}
	
	// actions invoked from view
	
	$scope.prepareCreateIndex=function() {
		$scope.broadcastMessage('prepareCreateIndex',{});
	}
	
	$scope.displayClusterHealth=function() {
		$scope.broadcastMessage('loadClusterHealth',{});
	}
	
	$scope.shutdownNode=function(node_id) {
		var response = $scope.client.shutdownNode(node_id,
			function(response) {
				$scope.setAlert(new Alert(true,"Node [" + node_id + "] successfully shutdown", response));
			},
			function(error) {
				$scope.setAlert(new Alert(false,"Error while shutting down node",error));
			}
		);
	}

	$scope.optimizeIndex=function(index){
		var response = $scope.client.optimizeIndex(index, 
			function(response) {
				$scope.setAlert(new Alert(true, "Index was successfully optimized", response));
			},
			function(error) {
				$scope.setAlert(new Alert(false, "Error while optimizing index", error));
			}				
		);
	}
	
	$scope.deleteIndex=function(index) {
		var response = $scope.client.deleteIndex(index, 
			function(response) {
				$scope.setAlert(new Alert(true, "Index was successfully deleted", response));
				$scope.closeModal(true);
			},
			function(error) {
				$scope.setAlert(new Alert(false, "Error while deleting index", error));
				$scope.closeModal(true);
			}	
		);
	}
	
	$scope.clearCache=function(index) {
		var response = $scope.client.clearCache(index,
			function(response) {
				$scope.setAlert(new Alert(true, "Index cache was successfully cleared", response));
				$scope.closeModal(false);		
			},
			function(error) {
				$scope.setAlert(new Alert(false, "Error while clearing index cache", error));
				$scope.closeModal(false);
			}
		);
	}

	$scope.refreshIndex=function(index){
		var response = $scope.client.refreshIndex(index, 
			function(response) {
				$scope.setAlert(new Alert(true, "Index was successfully refreshed", response));
				$scope.closeModal(false);
			},
			function(error) {
				$scope.setAlert(new Alert(false, "Error while refreshing index", error));	
				$scope.closeModal(false);
			}
		);
	}
	
	$scope.enableAllocation=function() {
		var response = $scope.client.enableShardAllocation(
			function(response) {
				$scope.setAlert(new Alert(true, "Shard allocation was successfully enabled", response));
				$scope.forceRefresh();
			},
			function(error) {
				$scope.setAlert(new Alert(false, "Error while enabling shard allocation", error));	
				$scope.forceRefresh();
			}
		);
	}
	
	$scope.disableAllocation=function(current_state) {
		var response = $scope.client.disableShardAllocation(
			function(response) {
				$scope.setAlert(new Alert(true, "Shard allocation was successfully disabled", response));
				$scope.forceRefresh();
			},
			function(error) {
				$scope.setAlert(new Alert(false, "Error while disabling shard allocation", error));	
				$scope.forceRefresh();
			}
		);
	}
	
	$scope.closeIndex=function(index) {
		var response = $scope.client.closeIndex(index, 
			function(response) {
				$scope.setAlert(new Alert(true, "Index was successfully closed", response));
				$scope.closeModal(true);
			},
			function(error) {
				$scope.setAlert(new Alert(false, "Error while closing index", error));	
				$scope.closeModal(true);
			}
		);
	}
	
	$scope.openIndex=function(index) {
		var response = $scope.client.openIndex(index,
			function(response) {
				$scope.setAlert(new Alert(true, "Index was successfully opened", response));
				$scope.closeModal(true);
			},
			function(error) {
				$scope.setAlert(new Alert(false, "Error while opening index", error));
				$scope.closeModal(true);
			}
		);
	}
}