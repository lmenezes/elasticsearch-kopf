function ClusterOverviewController($scope, $location, $timeout, IndexSettingsService, ClusterSettingsService, ConfirmDialogService) {
	$scope.idxSettingsSrv = IndexSettingsService;
	$scope.cluster_service = ClusterSettingsService;
	$scope.dialog_service = ConfirmDialogService;
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
									// TODO: cluster should go in here everywhere...
									$scope.cluster_service.cluster = cluster;
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
							$scope.setAlert(new ErrorAlert("Error while retrieving cluster information", error));
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
	
	$scope.shutdown_node=function(node_id, node_name) {
		$scope.dialog_service.open(
			"are you sure you want to shutdown node " + node_name + "?",
			"Shutting down a node will make all data stored in this node inaccessible, unless this data is replicated across other nodes." +
			"Replicated shards will be promoted to primary if the primary shard is no longer reachable.",
			"Shutdown",
			function() {
				var response = $scope.client.shutdownNode(node_id,
					function(response) {
						$scope.setAlert(new SuccessAlert("Node [" + node_id + "] successfully shutdown", response));
						$scope.forceRefresh();
					},
					function(error) {
						$scope.setAlert(new ErrorAlert("Error while shutting down node",error));
					}
				);
			}
		);
	}

	$scope.optimizeIndex=function(index){
		$scope.dialog_service.open(
			"are you sure you want to optimize index " + index + "?",
			"Optimizing an index is a resource intensive operation and should be done with caution."+
			"Usually, you will only want to optimize an index when it will no longer receive updates",
			"Optimize",
			function() {
				$scope.client.optimizeIndex(index, 
					function(response) {
						$scope.setAlert(new SuccessAlert("Index was successfully optimized", response));
					},
					function(error) {
						$scope.setAlert(new ErrorAlert("Error while optimizing index", error));
					}				
				);
			}
		);
	}
	
	$scope.deleteIndex=function(index) {
		$scope.dialog_service.open(
			"are you sure you want to delete index " + index + "?",
			"Deleting an index cannot be undone and all data for this index will be lost",
			"Delete",
			function() {
				$scope.client.deleteIndex(index, 
					function(response) {
						$scope.setAlert(new SuccessAlert("Index was successfully deleted", response));
						$scope.forceRefresh();
					},
					function(error) {
						$scope.setAlert(new ErrorAlert("Error while deleting index", error));
					}	
				);
			}
		);
	}
	
	$scope.clearCache=function(index) {
		$scope.dialog_service.open(
			"are you sure you want to clear the cache for index " + index + "?",
			"This will clear all caches for this index.",
			"Clear",
			function() {
				$scope.client.clearCache(index,
					function(response) {
						$scope.setAlert(new SuccessAlert("Index cache was successfully cleared", response));
						$scope.forceRefresh();
					},
					function(error) {
						$scope.setAlert(new ErrorAlert("Error while clearing index cache", error));
					}
				);
			}
		);
	}

	$scope.refreshIndex=function(index) {
		$scope.dialog_service.open(
			"are you sure you want to refresh index " + index + "?",
			"Refreshing an index makes all operations performed since the last refresh available for search.",
			"Refresh",
			function() {
				$scope.client.refreshIndex(index, 
					function(response) {
						$scope.setAlert(new SuccessAlert("Index was successfully refreshed", response));
					},
					function(error) {
						$scope.setAlert(new ErrorAlert("Error while refreshing index", error));	
					}
				);
			}
		);
	}
	
	$scope.enableAllocation=function() {
		var response = $scope.client.enableShardAllocation(
			function(response) {
				$scope.setAlert(new SuccessAlert("Shard allocation was successfully enabled", response));
				$scope.forceRefresh();
			},
			function(error) {
				$scope.setAlert(new ErrorAlert("Error while enabling shard allocation", error));	
				$scope.forceRefresh();
			}
		);
	}
	
	$scope.disableAllocation=function(current_state) {
		var response = $scope.client.disableShardAllocation(
			function(response) {
				$scope.setAlert(new SuccessAlert("Shard allocation was successfully disabled", response));
				$scope.forceRefresh();
			},
			function(error) {
				$scope.setAlert(new ErrorAlert("Error while disabling shard allocation", error));	
				$scope.forceRefresh();
			}
		);
	}
	
	$scope.closeIndex=function(index) {
		$scope.dialog_service.open(
			"are you sure you want to close index " + index + "?",
			"Closing an index will remove all it's allocated shards from the cluster. " +
			"Both searches and updates will no longer be accepted for the index." +
			"A closed index can be reopened at any time",
			"Close index",
			function() {
				$scope.client.closeIndex(index, 
					function(response) {
						$scope.setAlert(new SuccessAlert("Index was successfully closed", response));
						$scope.forceRefresh();
					},
					function(error) {
						$scope.setAlert(new ErrorAlert("Error while closing index", error));	
					}
				);
			}
		);
	}
	
	$scope.openIndex=function(index) {
		$scope.dialog_service.open(
			"are you sure you want to open index " + index + "?",
			"Opening an index will trigger the recovery process for the index. " +
			"This process could take sometime depending on the index size.",
			"Open index",
			function() {
				$scope.client.openIndex(index,
					function(response) {
						$scope.setAlert(new SuccessAlert("Index was successfully opened", response));
						$scope.forceRefresh();
					},
					function(error) {
						$scope.setAlert(new ErrorAlert("Error while opening index", error));
					}
				);
			}
		);
	}
	
	$scope.loadIndexSettings=function(index) {
		$('#index_settings_option a').tab('show');
		var indices = $scope.cluster.indices.filter(function(i) {
			return i.name == index;
		});
		$scope.idxSettingsSrv.index = indices[0];
		$('#idx_settings_tabs a:first').tab('show');		
	}
	
	$scope.loadClusterSettings=function() {
		$('#cluster_settings_option a').tab('show');
		$('#cluster_settings_tabs a:first').tab('show');		
	}
}