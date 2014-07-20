function ClusterOverviewController($scope, IndexSettingsService, ConfirmDialogService, AlertService) {
	$scope.pagination = new ClusterNavigation();
    $scope.index_paginator = new Paginator(1, 5, [], new IndexFilter("","", true, 0));

	$scope.getNodes=function() {
		if (isDefined($scope.cluster)) {
			return $scope.cluster.getNodes($scope.pagination.node_name, $scope.pagination.data,$scope.pagination.master,$scope.pagination.client);	
		}
	};
	
	$scope.closeModal=function(forced_refresh){
		if (forced_refresh) {
			$scope.refreshClusterState();
		}
	};
	
	$scope.shutdown_node=function(node_id, node_name) {
        ConfirmDialogService.open(
			"are you sure you want to shutdown node " + node_name + "?",
			"Shutting down a node will make all data stored in this node inaccessible, unless this data is replicated across other nodes." +
			"Replicated shards will be promoted to primary if the primary shard is no longer reachable.",
			"Shutdown",
			function() {
				var response = $scope.client.shutdownNode(node_id,
					function(response) {
						$scope.updateModel(function() {
							AlertService.success("Node [" + node_id + "] successfully shutdown", response);
						});
						$scope.refreshClusterState();
					},
					function(error) {
						$scope.updateModel(function() {
							AlertService.error("Error while shutting down node",error);
						});
					}
				);
			}
		);
	};

	$scope.optimizeIndex=function(index){
        ConfirmDialogService.open(
			"are you sure you want to optimize index " + index + "?",
			"Optimizing an index is a resource intensive operation and should be done with caution."+
			"Usually, you will only want to optimize an index when it will no longer receive updates",
			"Optimize",
			function() {
				$scope.client.optimizeIndex(index, 
					function(response) {
						$scope.updateModel(function() {
							AlertService.success("Index was successfully optimized", response);
						});
					},
					function(error) {
						$scope.updateModel(function() {
							AlertService.error("Error while optimizing index", error);
						});
					}				
				);
			}
		);
	};
	
	$scope.deleteIndex=function(index) {
        ConfirmDialogService.open(
			"are you sure you want to delete index " + index + "?",
			"Deleting an index cannot be undone and all data for this index will be lost",
			"Delete",
			function() {
				$scope.client.deleteIndex(index, 
					function(response) {
						$scope.refreshClusterState();
					},
					function(error) {
						$scope.updateModel(function() {
							AlertService.error("Error while deleting index", error);
						});
					}	
				);
			}
		);
	};
	
	$scope.clearCache=function(index) {
        ConfirmDialogService.open(
			"are you sure you want to clear the cache for index " + index + "?",
			"This will clear all caches for this index.",
			"Clear",
			function() {
				$scope.client.clearCache(index,
					function(response) {
						$scope.updateModel(function() {
							AlertService.success("Index cache was successfully cleared", response);
						});
						$scope.refreshClusterState();						
					},
					function(error) {
						$scope.updateModel(function() {
							AlertService.error("Error while clearing index cache", error);
						});
					}
				);
			}
		);
	};

	$scope.refreshIndex=function(index) {
        ConfirmDialogService.open(
			"are you sure you want to refresh index " + index + "?",
			"Refreshing an index makes all operations performed since the last refresh available for search.",
			"Refresh",
			function() {
				$scope.client.refreshIndex(index, 
					function(response) {
						$scope.updateModel(function() {
							AlertService.success("Index was successfully refreshed", response);
						});
					},
					function(error) {
						$scope.updateModel(function() {
							AlertService.error("Error while refreshing index", error);	
						});
					}
				);
			}
		);
	};
	
	$scope.enableAllocation=function() {
		var response = $scope.client.enableShardAllocation(
			function(response) {
				$scope.updateModel(function() {
					AlertService.success("Shard allocation was successfully enabled", response);
				});
				$scope.refreshClusterState();
			},
			function(error) {
				$scope.updateModel(function() {
					AlertService.error("Error while enabling shard allocation", error);	
				});
			}
		);
	};
	
	$scope.disableAllocation=function(current_state) {
		var response = $scope.client.disableShardAllocation(
			function(response) {
				$scope.updateModel(function() {
					AlertService.success("Shard allocation was successfully disabled", response);
				});
				$scope.refreshClusterState();
			},
			function(error) {
				$scope.updateModel(function() {
					AlertService.error("Error while disabling shard allocation", error);	
				});
			}
		);
	};
	
	$scope.closeIndex=function(index) {
        ConfirmDialogService.open(
			"are you sure you want to close index " + index + "?",
			"Closing an index will remove all it's allocated shards from the cluster. " +
			"Both searches and updates will no longer be accepted for the index." +
			"A closed index can be reopened at any time",
			"Close index",
			function() {
				$scope.client.closeIndex(index, 
					function(response) {
						$scope.updateModel(function() {
							AlertService.success("Index was successfully closed", response);
						});
						$scope.refreshClusterState();
					},
					function(error) {
						$scope.updateModel(function() {
							AlertService.error("Error while closing index", error);	
						});
					}
				);
			}
		);
	};
	
	$scope.openIndex=function(index) {
        ConfirmDialogService.open(
			"are you sure you want to open index " + index + "?",
			"Opening an index will trigger the recovery process for the index. " +
			"This process could take sometime depending on the index size.",
			"Open index",
			function() {
				$scope.client.openIndex(index,
					function(response) {
						$scope.updateModel(function() {
							AlertService.success("Index was successfully opened", response);
						});
						$scope.refreshClusterState();
					},
					function(error) {
						$scope.updateModel(function() {
							AlertService.error("Error while opening index", error);
						});
					}
				);
			}
		);
	};
	
	$scope.loadIndexSettings=function(index) {
		$('#index_settings_option a').tab('show');
		var indices = $scope.cluster.indices.filter(function(i) {
			return i.name == index;
		});
        IndexSettingsService.index = indices[0];
		$('#idx_settings_tabs a:first').tab('show');
		$(".setting-info").popover();		
	};

	$scope.getPage=function() {
        var page;
        // updates collection when cluster info has been updated
        if (isDefined($scope.cluster) && ($scope.index_paginator.filter.timestamp === 0 ||
            $scope.index_paginator.filter.timestamp != $scope.cluster.created_at)) {
            $scope.index_paginator.setCollection($scope.cluster.indices);
            $scope.index_paginator.filter.timestamp = $scope.cluster.created_at;
        }
        page = $scope.index_paginator.getPage();
        while (page.length < $scope.index_paginator.page_size) {
            page.push(null);
        }
        return page;
	};

}