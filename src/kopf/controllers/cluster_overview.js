kopf.controller('ClusterOverviewController', ['$scope', '$window',
  'ConfirmDialogService', 'AlertService', 'ElasticService', 'AppState',
  function($scope, $window, ConfirmDialogService, AlertService, ElasticService,
           AppState) {

    $scope.cluster = undefined;

    $scope.nodes = [];

    $($window).resize(function() {
      $scope.$apply(function() {
        $scope.index_paginator.setPageSize($scope.getPageSize());
      });
    });

    $scope.getPageSize = function() {
      return Math.max(Math.round($window.innerWidth / 280), 1);
    };

    $scope.index_filter = AppState.getProperty(
        'ClusterOverview',
        'index_filter',
        new IndexFilter('', true, false, true, 0)
    );

    $scope.index_paginator = AppState.getProperty(
        'ClusterOverview',
        'index_paginator',
        new Paginator(1, $scope.getPageSize(), [], $scope.index_filter)
    );

    $scope.page = $scope.index_paginator.getPage();

    $scope.node_filter = AppState.getProperty(
        'ClusterOverview',
        'node_filter',
        new NodeFilter('', true, false, false, 0)
    );

    $scope.$watch(
        function() {
          return ElasticService.cluster;
        },
        function(newValue, oldValue) {
          $scope.cluster = ElasticService.cluster;
          $scope.setIndices(ElasticService.getIndices());
          $scope.setNodes(ElasticService.getNodes());
        }
    );

    $scope.$watch('node_filter',
        function(filter, previous) {
          $scope.setNodes(ElasticService.getNodes());
        },
        true);

    $scope.$watch('index_paginator', function(filter, previous) {
      $scope.setIndices(ElasticService.getIndices());
    }, true);

    $scope.setNodes = function(nodes) {
      $scope.nodes = nodes.filter(function(node) {
        return $scope.node_filter.matches(node);
      });
    };

    $scope.setIndices = function(indices) {
      $scope.index_paginator.setCollection(indices);
      $scope.page = $scope.index_paginator.getPage();
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
            ElasticService.shutdownNode(nodeId);
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

    $scope.promptCloseIndex = function(index) {
      ConfirmDialogService.open(
              'are you sure you want to close index ' + index + '?',
              'Closing an index will remove all it\'s allocated shards from ' +
              'the cluster.  Both searches and updates will no longer be ' +
              'accepted for the index. A closed index can be reopened.',
          'Close index',
          function() {
            ElasticService.closeIndex(index);
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
            ElasticService.openIndex(index);
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
