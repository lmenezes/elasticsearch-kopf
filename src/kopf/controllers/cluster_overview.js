kopf.controller('ClusterOverviewController', ['$scope', '$window',
  'ConfirmDialogService', 'AlertService', 'ElasticService', 'SettingsService',
  'OverviewFilter',
  function($scope, $window, ConfirmDialogService, AlertService, ElasticService,
           SettingsService, OverviewFilter) {

    $scope.cluster = null;
    $scope.cluster_health = null;

    $($window).resize(function() {
      $scope.$apply(function() {
        $scope.index_paginator.setPageSize($scope.getPageSize());
      });
    });

    $scope.getPageSize = function() {
      return Math.max(Math.round($window.innerWidth / 280), 1);
    };

    $scope.index_paginator = new Paginator(
        OverviewFilter.page,
        $scope.getPageSize(),
        [],
        OverviewFilter.index
    );

    $scope.page = $scope.index_paginator.getPage();

    $scope.node_filter = OverviewFilter.node;

    $scope.nodes = [];

    $scope.$watch(
        function() {
          return ElasticService.clusterHealth;
        },
        function(newValue, oldValue) {
          if (isDefined(ElasticService.clusterHealth)) {
            $scope.cluster_health = ElasticService.clusterHealth;
          } else {
            $scope.cluster_health = null;
          }
        }
    );

    $scope.$watch(
        function() {
          return ElasticService.cluster;
        },
        function(newValue, oldValue) {
          if (isDefined(ElasticService.cluster)) {
            $scope.cluster = ElasticService.cluster;
            $scope.setIndices(ElasticService.getIndices());
            $scope.setNodes(ElasticService.cluster.getNodes(true));
          } else {
            $scope.cluster = null;
            $scope.setIndices([]);
            $scope.setNodes([]);
          }
        }
    );

    $scope.$watch('index_paginator', function(filter, previous) {
      $scope.setIndices(ElasticService.getIndices());
    }, true);

    $scope.$watch('node_filter',
        function(filter, previous) {
          if (isDefined(ElasticService.cluster)) {
            $scope.setNodes(ElasticService.cluster.getNodes(true));
          } else {
            $scope.setNodes([]);
          }
        },
        true);

    $scope.setNodes = function(nodes) {
      $scope.nodes = nodes.filter(function(node) {
        return $scope.node_filter.matches(node);
      });
    };

    $scope.setIndices = function(indices) {
      $scope.index_paginator.setCollection(indices);
      $scope.page = $scope.index_paginator.getPage();
    };

    $scope.closeModal = function(forcedRefresh) {
      if (forcedRefresh) {
        ElasticService.refresh();
      }
    };

    $scope.shutdownNode = function(nodeId) {
      ElasticService.shutdownNode(nodeId,
          function(data) {
            AlertService.success('Node [' + nodeId + '] was shutdown', data);
            ElasticService.refresh();
          },
          function(error) {
            AlertService.error('Error while shutting down node', error);
          }
      );
    };

    $scope.promptShutdownNode = function(nodeId, nodeName) {
      ConfirmDialogService.open(
              'are you sure you want to shutdown node ' + nodeName + '?',
              'Shutting down a node will make all data stored in this node ' +
              'inaccessible, unless it\'s replicated across other nodes.' +
              'Replicated shards will be promoted to primary if the primary ' +
              'shard is no longer reachable.',
          'Shutdown',
          function() {
            $scope.shutdownNode(nodeId);
          }
      );
    };

    $scope.optimizeIndex = function(index) {
      ElasticService.optimizeIndex(index,
          function(response) {
            AlertService.success('Index was successfully optimized', response);
          },
          function(error) {
            AlertService.error('Error while optimizing index', error);
          }
      );
    };

    $scope.promptOptimizeIndex = function(index) {
      ConfirmDialogService.open(
              'are you sure you want to optimize index ' + index + '?',
              'Optimizing an index is a resource intensive operation and ' +
              'should be done with caution. Usually, you will only want to ' +
              'optimize an index when it will no longer receive updates',
          'Optimize',
          function() {
            $scope.optimizeIndex(index);
          }
      );
    };

    $scope.deleteIndex = function(index) {
      ElasticService.deleteIndex(index,
          function(response) {
            ElasticService.refresh();
          },
          function(error) {
            AlertService.error('Error while deleting index', error);
          }
      );
    };

    $scope.promptDeleteIndex = function(index) {
      ConfirmDialogService.open(
              'are you sure you want to delete index ' + index + '?',
              'Deleting an index cannot be undone and all data for this ' +
              'index will be lost',
          'Delete',
          function() {
            $scope.deleteIndex(index);
          }
      );
    };

    $scope.clearCache = function(index) {
      ElasticService.clearCache(index,
          function(response) {
            AlertService.success('Index cache was cleared', response);
            ElasticService.refresh();
          },
          function(error) {
            AlertService.error('Error while clearing index cache', error);
          }
      );
    };

    $scope.promptClearCache = function(index) {
      ConfirmDialogService.open(
              'are you sure you want to clear the cache for ' + index + '?',
          'This will clear all caches for this index.',
          'Clear',
          function() {
            $scope.clearCache(index);
          }
      );
    };

    $scope.refreshIndex = function(index) {
      ElasticService.refreshIndex(index,
          function(response) {
            AlertService.success('Index was successfully refreshed', response);
          },
          function(error) {
            AlertService.error('Error while refreshing index', error);
          }
      );
    };

    $scope.promptRefreshIndex = function(index) {
      ConfirmDialogService.open(
              'are you sure you want to refresh index ' + index + '?',
              'Refreshing an index makes all operations performed since the ' +
              'last refresh available for search.',
          'Refresh',
          function() {
            $scope.refreshIndex(index);
          }
      );
    };

    $scope.enableAllocation = function() {
      ElasticService.enableShardAllocation(
          function(response) {
            AlertService.success('Shard allocation was enabled', response);
            ElasticService.refresh();
          },
          function(error) {
            AlertService.error('Error while enabling shard allocation', error);
          }
      );
    };

    $scope.disableAllocation = function() {
      ElasticService.disableShardAllocation(
          function(response) {
            AlertService.success('Shard allocation was disabled', response);
            ElasticService.refresh();
          },
          function(error) {
            AlertService.error('Error while disabling shard allocation', error);
          }
      );
    };

    $scope.closeIndex = function(index) {
      ElasticService.closeIndex(index,
          function(response) {
            AlertService.success('Index was successfully closed', response);
            ElasticService.refresh();
          },
          function(error) {
            AlertService.error('Error while closing index', error);
          }
      );
    };

    $scope.promptCloseIndex = function(index) {
      ConfirmDialogService.open(
              'are you sure you want to close index ' + index + '?',
              'Closing an index will remove all it\'s allocated shards from ' +
              'the cluster.  Both searches and updates will no longer be ' +
              'accepted for the index. A closed index can be reopened.',
          'Close index',
          function() {
            $scope.closeIndex(index);
          }
      );
    };

    $scope.openIndex = function(index) {
      ElasticService.openIndex(index,
          function(response) {
            AlertService.success('Index was successfully opened', response);
            ElasticService.refresh();
          },
          function(error) {
            AlertService.error('Error while opening index', error);
          }
      );
    };

    $scope.promptOpenIndex = function(index) {
      ConfirmDialogService.open(
              'are you sure you want to open index ' + index + '?',
              'Opening an index will trigger the recovery process. ' +
              'This process could take sometime depending on the index size.',
          'Open index',
          function() {
            $scope.openIndex(index);
          }
      );
    };

    $scope.showIndexSettings = function(index) {
      ElasticService.getIndexMetadata(index,
          function(metadata) {
            $scope.displayInfo('settings for ' + index, metadata.settings);
          },
          function(error) {
            AlertService.error('Error while loading index settings', error);
          }
      );
    };

    $scope.showIndexMappings = function(index) {
      ElasticService.getIndexMetadata(index,
          function(metadata) {
            $scope.displayInfo('mappings for ' + index, metadata.mappings);
          },
          function(error) {
            AlertService.error('Error while loading index mappings', error);
          }
      );
    };

    $scope.showNodeStats = function(nodeId) {
      ElasticService.getNodeStats(nodeId,
          function(nodeStats) {
            $scope.displayInfo('stats for ' + nodeStats.name, nodeStats.stats);
          },
          function(error) {
            AlertService.error('Error while loading node stats', error);
          }
      );
    };

  }
]);
