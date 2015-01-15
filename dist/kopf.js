var kopf = angular.module('kopf', ['ngRoute']);

// manages behavior of confirmation dialog
kopf.factory('ConfirmDialogService', function() {
  this.header = 'Default Header';
  this.body = 'Default Body';
  this.cancel_text = 'cancel';
  this.confirm_text = 'confirm';

  this.confirm = function() {
    // when created, does nothing
  };

  this.close = function() {
    // when created, does nothing
  };

  this.open = function(header, body, action, confirmCallback, closeCallback) {
    this.header = header;
    this.body = body;
    this.action = action;
    this.confirm = confirmCallback;
    this.close = closeCallback;
  };

  return this;
});

kopf.config(function($routeProvider, $locationProvider) {
  $locationProvider.hashPrefix('!');
  $routeProvider.
      when('/cluster', {
        templateUrl: 'partials/cluster_overview.html',
        controller: 'ClusterOverviewController'
      }).
      when('/nodes', {
        templateUrl: 'partials/nodes/nodes.html',
        controller: 'NodesController'
      }).
      when('/rest', {
        templateUrl: 'partials/rest_client.html',
        controller: 'RestController'
      }).
      when('/aliases', {
        templateUrl: 'partials/aliases.html',
        controller: 'AliasesController'
      }).
      when('/analysis', {
        templateUrl: 'partials/analysis.html',
        controller: 'AnalysisController'
      }).
      when('/percolator', {
        templateUrl: 'partials/percolator.html',
        controller: 'PercolatorController'
      }).
      when('/warmers', {
        templateUrl: 'partials/warmers.html',
        controller: 'WarmersController'
      }).
      when('/snapshot', {
        templateUrl: 'partials/snapshot.html',
        controller: 'SnapshotController'
      }).
      when('/createIndex', {
        templateUrl: 'partials/create_index.html',
        controller: 'CreateIndexController'
      }).
      when('/clusterHealth', {
        templateUrl: 'partials/cluster_health.html',
        controller: 'ClusterHealthController'
      }).
      when('/clusterSettings', {
        templateUrl: 'partials/cluster_settings.html',
        controller: 'ClusterSettingsController'
      }).
      when('/indexSettings', {
        templateUrl: 'partials/index_settings.html',
        controller: 'IndexSettingsController'
      }).
      otherwise({redirectTo: '/cluster'});
});

kopf.controller('AlertsController', ['$scope', 'AlertService',
  function($scope, AlertService) {

    $scope.alerts = [];

    $scope.$watch(
        function() {
          return AlertService.alerts;
        },
        function(newValue, oldValue) {
          $scope.alerts = AlertService.alerts;
        }
    );

    $scope.remove = function(id) {
      AlertService.remove(id);
    };

  }

]);

kopf.controller('AliasesController', ['$scope', 'AlertService',
  'AceEditorService', 'ElasticService',
  function($scope, AlertService, AceEditorService, ElasticService) {

    $scope.paginator = new Paginator(1, 10, [], new AliasFilter('', ''));
    $scope.page = $scope.paginator.getPage();
    $scope.original = [];
    $scope.editor = undefined;
    $scope.new_alias = new Alias('', '', '', '', '');

    $scope.aliases = [];

    $scope.$watch(
        function() {
          return ElasticService.cluster;
        },
        function(filter, previous) {
          $scope.indices = ElasticService.getIndices();
        },
        true
    );

    $scope.$watch('paginator', function(filter, previous) {
      $scope.page = $scope.paginator.getPage();
    }, true);

    $scope.viewDetails = function(alias) {
      $scope.details = alias;
    };

    $scope.initEditor = function() {
      if (!angular.isDefined($scope.editor)) {
        $scope.editor = AceEditorService.init('alias-filter-editor');
      }
    };

    $scope.addAlias = function() {
      $scope.new_alias.filter = $scope.editor.format();
      if (!isDefined($scope.editor.error)) {
        try {
          $scope.new_alias.validate();
          var indexName = $scope.new_alias.index;
          var aliasName = $scope.new_alias.alias;
          // if alias already exists, check if its already associated with index
          var collection = $scope.paginator.getCollection();
          var indices = collection.filter(function(a) {
            return a.index == indexName;
          });
          if (indices.length === 0) {
            collection.push(new IndexAliases(indexName, [$scope.new_alias]));
          } else {
            var indexAliases = indices[0];
            var aliases = indexAliases.aliases.filter(function(a) {
              return aliasName == a.alias;
            });
            if (aliases.length > 0) {
              throw 'Alias is already associated with this index';
            } else {
              indexAliases.aliases.push($scope.new_alias);
            }
          }
          $scope.new_alias = new Alias();
          $scope.paginator.setCollection(collection);
          $scope.page = $scope.paginator.getPage();
          AlertService.success('Alias successfully added. Note that changes ' +
              'made will only be persisted after saving changes');
        } catch (error) {
          AlertService.error(error, null);
        }
      } else {
        AlertService.error('Invalid filter defined for alias',
            $scope.editor.error);
      }
    };

    $scope.removeIndexAliases = function(index) {
      var collection = $scope.paginator.getCollection();
      for (var position = 0; position < collection.length; position++) {
        if (index == collection[position].index) {
          collection.splice(position, 1);
          break;
        }
      }
      $scope.paginator.setCollection(collection);
      $scope.page = $scope.paginator.getPage();
      AlertService.success('All aliases were removed for ' + index);
    };

    $scope.removeIndexAlias = function(index, alias) {
      var indexPosition = 0;
      var collection = $scope.paginator.getCollection();
      for (; indexPosition < collection.length; indexPosition++) {
        if (index == collection[indexPosition].index) {
          break;
        }
      }
      var indexAliases = collection[indexPosition];
      var size = indexAliases.aliases.length;
      for (var aliasPosition = 0; aliasPosition < size; aliasPosition++) {
        if (alias == indexAliases.aliases[aliasPosition].alias) {
          indexAliases.aliases.splice(aliasPosition, 1);
          if (indexAliases.aliases.length === 0) {
            collection.splice(indexPosition, 1);
          }
          break;
        }
      }
      $scope.paginator.setCollection(collection);
      $scope.page = $scope.paginator.getPage();
      AlertService.success('Alias successfully dissociated from index. ' +
          'Note that changes made will only be persisted after saving changes');
    };

    $scope.mergeAliases = function() {
      var collection = $scope.paginator.getCollection();
      var deletes = IndexAliases.diff(collection, $scope.original);
      var adds = IndexAliases.diff($scope.original, collection);
      if (adds.length === 0 && deletes.length === 0) {
        AlertService.warn('No changes were made: nothing to save');
      } else {
        ElasticService.updateAliases(adds, deletes,
            function(response) {
              AlertService.success('Aliases were successfully updated',
                  response);
              $scope.loadAliases();
            },
            function(error) {
              AlertService.error('Error while updating aliases', error);
            }
        );
      }
    };

    $scope.loadAliases = function() {
      ElasticService.fetchAliases(
          function(indexAliases) {
            $scope.original = indexAliases.map(function(ia) {
              return ia.clone();
            });
            $scope.paginator.setCollection(indexAliases);
            $scope.page = $scope.paginator.getPage();
          },
          function(error) {
            AlertService.error('Error while fetching aliases', error);
          }
      );
    };

    $scope.initializeController = function() {
      $scope.indices = ElasticService.getIndices();
      $scope.loadAliases();
      $scope.initEditor();
    };

  }
]);

kopf.controller('AnalysisController', ['$scope', '$location', '$timeout',
  'AlertService', 'ElasticService',
  function($scope, $location, $timeout, AlertService, ElasticService) {

    $scope.indices = null;

    // by index
    $scope.field_index = null;
    $scope.field_index_metadata = null;
    $scope.field_type = '';
    $scope.field_field = '';
    $scope.field_text = '';
    $scope.field_tokens = [];

    // By analyzer
    $scope.analyzer_index = '';
    $scope.analyzer_index_metadata = null;
    $scope.analyzer_analyzer = '';
    $scope.analyzer_text = '';
    $scope.analyzer_tokens = [];

    $scope.$watch(
        function() {
          return ElasticService.cluster;
        },
        function(filter, previous) {
          $scope.indices = ElasticService.getOpenIndices();
        },
        true
    );

    $scope.$watch('field_index', function(current, previous) {
      if (isDefined(current)) {
        $scope.loadIndexTypes(current.name);
      }
    });

    $scope.loadIndexTypes = function(index) {
      $scope.field_type = '';
      $scope.field_field = '';
      if (notEmpty(index)) {
        ElasticService.getIndexMetadata(index,
            function(metadata) {
              $scope.field_index_metadata = metadata;
            },
            function(error) {
              $scope.field_index = '';
              AlertService.error('Error while loading index metadata', error);
            }
        );
      }
    };

    $scope.$watch('analyzer_index', function(current, previous) {
      if (isDefined(current)) {
        $scope.loadIndexAnalyzers(current.name);
      }
    });

    $scope.loadIndexAnalyzers = function(index) {
      $scope.analyzer_analyzer = '';
      if (notEmpty(index)) {
        ElasticService.getIndexMetadata(index,
            function(metadata) {
              $scope.analyzer_index_metadata = metadata;
            },
            function(error) {
              $scope.analyzer_index = '';
              AlertService.error('Error while loading index metadata', error);
            }
        );
      }
    };

    $scope.analyzeByField = function() {
      if ($scope.field_field.length > 0 && $scope.field_text.length > 0) {
        $scope.field_tokens = null;
        ElasticService.analyzeByField($scope.field_index.name,
            $scope.field_type, $scope.field_field, $scope.field_text,
            function(response) {
              $scope.field_tokens = response;
            },
            function(error) {
              $scope.field_tokens = null;
              AlertService.error('Error while analyzing text', error);
            }
        );
      }
    };

    $scope.analyzeByAnalyzer = function() {
      if (notEmpty($scope.analyzer_analyzer) &&
          notEmpty($scope.analyzer_text)) {
        $scope.analyzer_tokens = null;
        ElasticService.analyzeByAnalyzer($scope.analyzer_index.name,
            $scope.analyzer_analyzer, $scope.analyzer_text,
            function(response) {
              $scope.analyzer_tokens = response;
            },
            function(error) {
              $scope.analyzer_tokens = null;
              AlertService.error('Error while analyzing text', error);
            }
        );
      }
    };

    $scope.initializeController = function() {
      $scope.indices = ElasticService.getOpenIndices();
    };

  }
]);

kopf.controller('BenchmarkController', ['$scope', '$location', '$timeout',
  'AlertService', 'ElasticService',
  function($scope, $location, $timeout, AlertService, ElasticService) {

    $scope.bench = new Benchmark();
    $scope.competitor = new Competitor();
    $scope.indices = [];
    $scope.types = [];

    $scope.initializeController = function() {
      $scope.indices = ElasticService.getIndices();
    };

    $scope.addCompetitor = function() {
      if (notEmpty($scope.competitor.name)) {
        this.bench.addCompetitor($scope.competitor);
        $scope.competitor = new Competitor();
      } else {
        AlertService.error('Competitor needs a name');
      }
    };

    $scope.removeCompetitor = function(index) {
      $scope.bench.competitors.splice(index, 1);
    };

    $scope.editCompetitor = function(index) {
      var edit = $scope.bench.competitors.splice(index, 1);
      $scope.competitor = edit[0];
    };

    $scope.runBenchmark = function() {
      $('#benchmark-result').html('');
      try {
        var json = $scope.bench.toJson();
        ElasticService.executeBenchmark(json,
            function(response) {
              $scope.result = JSONTree.create(response);
              $('#benchmark-result').html($scope.result);
            },
            function(error, status) {
              if (status == 503) {
                AlertService.info('No available nodes for benchmarking. ' +
                    'At least one node must be started with ' +
                    '\'--node.bench true\' option.');
              } else {
                AlertService.error(error.error);
              }
            }
        );
      } catch (error) {
        AlertService.error(error);
      }
    };

  }
]);

kopf.controller('ClusterHealthController', ['$scope', '$location', '$timeout',
  '$sce', '$http', 'AlertService', 'ConfirmDialogService', 'ElasticService',
  function($scope, $location, $timeout, $sce, $http, AlertService,
           ConfirmDialogService, ElasticService) {

    var defaultDescription = 'Cluster information delivered by kopf';
    $scope.shared_url = '';
    $scope.results = null;

    $scope.initializeController = function() {
      $('#cluster_health_option a').tab('show');
      $scope.results = null;
      // selects which info should be retrieved
      $scope.retrieveHealth = true;
      $scope.retrieveState = true;
      $scope.retrieveStats = true;
      $scope.retrieveHotThreads = true;
      $scope.gist_title = '';
    };

    $scope.checkPublishClusterHealth = function() {
      ConfirmDialogService.open(
          'Are you share you want to share your cluster information?',
              'By sharing information through a public Gist you might be ' +
              'exposing sensitive information about your cluster, such as ' +
              'host name, indices names and etc.',
          'Agree',
          function() {
            $scope.confirm_share = true;
            $scope.publishClusterHealth();
          }
      );
    };

    $scope.loadClusterHealth = function() {
      var results = {};
      $scope.results = null;
      var infoId = AlertService.info('Loading cluster health state. ' +
          'This could take a few moments.', {}, 30000);
      ElasticService.getClusterDiagnosis($scope.retrieveHealth,
          $scope.retrieveState, $scope.retrieveStats, $scope.retrieveHotThreads,
          function(responses) {
            $scope.state = '';
            if (!(responses instanceof Array)) {
              // so logic bellow remains the same in case result is not an array
              responses = [responses];
            }
            var idx = 0;
            if ($scope.retrieveHealth) {
              results.health_raw = responses[idx++];
              var htmlHealth = JSONTree.create(results.health_raw);
              results.health = $sce.trustAsHtml(htmlHealth);
            }
            if ($scope.retrieveState) {
              results.state_raw = responses[idx++];
              var htmlState = JSONTree.create(results.state_raw);
              results.state = $sce.trustAsHtml(htmlState);
            }
            if ($scope.retrieveStats) {
              results.stats_raw = responses[idx++];
              var htmlStats = JSONTree.create(results.stats_raw);
              results.stats = $sce.trustAsHtml(htmlStats);
            }
            if ($scope.retrieveHotThreads) {
              results.hot_threads = responses[idx];
            }
            $scope.results = results;
            $scope.state = '';
            AlertService.remove(infoId);
          },
          function(failedRequest) {
            AlertService.remove(infoId);
            AlertService.error('Error while retrieving cluster health ' +
                'information', failedRequest.data);
          }
      );
    };

    $scope.publishClusterHealth = function() {
      var gist = {description: defaultDescription, public: true};
      if (notEmpty($scope.gist_title)) {
        gist.description = $scope.gist_title;
      }
      var files = {};
      if (isDefined($scope.results)) {
        if (isDefined($scope.results.health_raw)) {
          var health = JSON.stringify($scope.results.health_raw, undefined, 4);
          files.health = {'content': health, 'indent': '2', 'language': 'JSON'};
        }
        if (isDefined($scope.results.state_raw)) {
          var state = JSON.stringify($scope.results.state_raw, undefined, 4);
          files.state = {'content': state, 'indent': '2', 'language': 'JSON'};
        }
        if (isDefined($scope.results.stats_raw)) {
          var stats = JSON.stringify($scope.results.stats_raw, undefined, 4);
          files.stats = {'content': stats, 'indent': '2', 'language': 'JSON'};
        }
        if (isDefined($scope.results.hot_threads)) {
          var ht = $scope.results.hot_threads;
          files.hot_threads = {'content': ht,
            'indent': '2', 'language': 'JSON'
          };
        }
      }
      gist.files = files;
      var data = JSON.stringify(gist, undefined, 4);

      $http({method: 'POST', url: 'https://api.github.com/gists', data: data}).
          success(function(data, status, headers, config) {
            $scope.addToHistory(new Gist(gist.description, data.html_url));
            AlertService.success('Cluster health information successfully ' +
                    'shared at: ' + data.html_url,
                null, 60000);
          }).
          error(function(data, status, headers, config) {
            AlertService.error('Error while publishing Gist', data);
          });
    };

    $scope.addToHistory = function(gist) {
      $scope.gist_history.unshift(gist);
      if ($scope.gist_history.length > 30) {
        $scope.gist_history.length = 30;
      }
      localStorage.kopf_gist_history = JSON.stringify($scope.gist_history);
    };

    $scope.loadHistory = function() {
      var history = [];
      if (isDefined(localStorage.kopf_gist_history)) {
        try {
          history = JSON.parse(localStorage.kopf_gist_history).map(function(h) {
            return new Gist().loadFromJSON(h);
          });
        } catch (error) {
          localStorage.kopf_gist_history = null;
        }
      }
      return history;
    };

    $scope.gist_history = $scope.loadHistory();

  }
]);

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

kopf.controller('ClusterSettingsController', ['$scope', '$location', '$timeout',
  'AlertService', 'ElasticService',
  function($scope, $location, $timeout, AlertService, ElasticService) {

    $scope.initializeController = function() {
      $('#cluster_settings_option a').tab('show');
      $('#cluster_settings_tabs a:first').tab('show');
      $('.setting-info').popover();
      $scope.active_settings = 'transient'; // remember last active?
      $scope.settings = new ClusterSettings(ElasticService.cluster.settings);
    };

    $scope.save = function() {
      var settings = JSON.stringify($scope.settings, undefined, '');
      ElasticService.updateClusterSettings(settings,
          function(response) {
            AlertService.success('Cluster settings were successfully updated',
                response);
            ElasticService.refresh();
          },
          function(error) {
            AlertService.error('Error while updating cluster settings', error);
          }
      );
    };
  }
]);

kopf.controller('ConfirmDialogController', ['$scope', 'ConfirmDialogService',
  function($scope, ConfirmDialogService) {

    $scope.dialog_service = ConfirmDialogService;

    $scope.close = function() {
      $scope.dialog_service.close();
    };

    $scope.confirm = function() {
      $scope.dialog_service.confirm();
    };

  }
]);

kopf.controller('CreateIndexController', ['$scope', 'AlertService',
  'ElasticService', 'AceEditorService',
  function($scope, AlertService, ElasticService, AceEditorService) {

    $scope.source_index = null;
    $scope.shards = '';
    $scope.replicas = '';
    $scope.name = '';
    $scope.indices = [];

    $scope.initializeController = function() {
      $('#create_index_option a').tab('show');
      $scope.prepareCreateIndex();
    };

    $scope.updateEditor = function() {
      ElasticService.getIndexMetadata($scope.source_index,
          function(meta) {
            var body = {settings: meta.settings, mappings: meta.mappings};
            $scope.editor.setValue(JSON.stringify(body, null, 2));
          },
          function(error) {
            AlertService.error('Error while loading index settings', error);
          }
      );
    };

    $scope.createIndex = function() {
      if ($scope.name.trim().length === 0) {
        AlertService.error('You must specify a valid index name');
      } else {
        var bodyString = $scope.editor.format();
        if (isDefined($scope.editor.error)) {
          AlertService.error('Invalid JSON: ' + $scope.editor.error);
        } else {
          var body = JSON.parse(bodyString);
          if (Object.keys(body).length === 0) {
            body = {settings: {index: {}}};
            if ($scope.shards.trim().length > 0) {
              body.settings.index.number_of_shards = $scope.shards;
            }
            if ($scope.replicas.trim().length > 0) {
              body.settings.index.number_of_replicas = $scope.replicas;
            }
            bodyString = JSON.stringify(body);
          }
          ElasticService.createIndex($scope.name, bodyString,
              function(response) {
                ElasticService.refresh();
              },
              function(error) {
                AlertService.error('Error while creating index', error);
              }
          );
        }
      }
    };

    $scope.prepareCreateIndex = function() {
      if (!isDefined($scope.editor)) {
        $scope.editor = AceEditorService.init('index-settings-editor');
      }
      $scope.indices = ElasticService.getIndices();
      $scope.source_index = null;
      $scope.editor.setValue('{}');
      $scope.shards = '';
      $scope.name = '';
      $scope.replicas = '';
    };
  }
]);

kopf.controller('GlobalController', ['$scope', '$location', '$sce', '$window',
  'AlertService', 'ThemeService', 'ElasticService',
  function($scope, $location, $sce, $window, AlertService, ThemeService,
           ElasticService) {

    $scope.version = '1.4.4';

    $scope.modal = new ModalControls();

    $scope.getTheme = function() {
      return ThemeService.getTheme();
    };

    $scope.readParameter = function(name) {
      var regExp = new RegExp('[\\?&]' + name + '=([^&#]*)');
      var results = regExp.exec($window.location.href);
      return isDefined(results) ? results[1] : null;
    };

    $scope.connect = function() {
      try {
        var host = 'http://localhost:9200'; // default
        if ($location.host() !== '') { // not opening from fs
          var location = $scope.readParameter('location');
          var url = $location.absUrl();
          if (isDefined(location)) {
            host = location;
          } else if (url.indexOf('/_plugin/kopf') > -1) {
            host = url.substring(0, url.indexOf('/_plugin/kopf'));
          } else {
            host = $location.protocol() + '://' + $location.host() +
                ':' + $location.port();
          }
        }
        ElasticService.connect(host);
      } catch (error) {
        AlertService.error(error.message, error.body);
      }
    };

    $scope.connect();

    ElasticService.refresh();

    $scope.hasConnection = function() {
      return isDefined(ElasticService.clusterHealth);
    };

    $scope.displayInfo = function(title, info) {
      $scope.modal.title = title;
      $scope.modal.info = $sce.trustAsHtml(JSONTree.create(info));
      $('#modal_info').modal({show: true, backdrop: true});
    };

    $scope.getCurrentTime = function() {
      return getTimeString(new Date());
    };

  }
]);

kopf.controller('IndexSettingsController', ['$scope', '$location',
  'AlertService', 'ElasticService',
  function($scope, $location, AlertService, ElasticService) {

    $scope.index = null;
    $scope.settings = null;
    $scope.editable_settings = null;

    $scope.save = function() {
      var index = $scope.index;
      var settings = $scope.settings;
      var newSettings = {};
      var editableSettings = $scope.editable_settings;
      // TODO: could move that to editable_index_settings model
      editableSettings.valid_settings.forEach(function(setting) {
        if (notEmpty(editableSettings[setting])) {
          newSettings[setting] = editableSettings[setting];
        }
      });
      ElasticService.updateIndexSettings(index,
          JSON.stringify(newSettings, undefined, ''),
          function(response) {
            AlertService.success('Index settings were successfully updated',
                response);
            ElasticService.refresh();
          },
          function(error) {
            AlertService.error('Error while updating index settings', error);
          }
      );
    };

    $scope.initializeController = function() {
      var index = $location.search().index;
      ElasticService.getIndexMetadata(index,
          function(metadata) {
            $scope.index = index;
            $scope.settings = metadata.settings;
            $scope.editable_settings = new EditableIndexSettings(
                $scope.settings
            );
          },
          function(error) {
            AlertService.error('Error while loading index settings for [' +
                    index + ']',
                error);
          }
      );
    };

  }
]);

kopf.controller('NavbarController', ['$scope', '$location', 'SettingsService',
  'ThemeService', 'ElasticService', 'AlertService', 'HostHistoryService',
  'DebugService',
  function($scope, $location, SettingsService, ThemeService, ElasticService,
           AlertService, HostHistoryService, DebugService) {

    $scope.new_refresh = SettingsService.getRefreshInterval();
    $scope.theme = ThemeService.getTheme();
    $scope.new_host = '';
    $scope.current_host = ElasticService.getHost();
    $scope.host_history = HostHistoryService.getHostHistory();

    $scope.clusterStatus = undefined;
    $scope.clusterName = undefined;
    $scope.fetchedAt = undefined;

    $scope.debugEnabled = DebugService.isEnabled();

    $scope.$watch('debugEnabled',
        function(newValue, oldValue) {
          if (newValue != oldValue) {
            DebugService.toggleEnabled();
          }
        }
    );

    $scope.$watch(
        function() {
          return ElasticService.getHost();
        },
        function(newValue, oldValue) {
          $scope.current_host = ElasticService.getHost();
        }
    );

    $scope.$watch(
        function() {
          return ElasticService.clusterHealth;
        },
        function(newValue, oldValue) {
          if (isDefined(ElasticService.clusterHealth)) {
            $scope.clusterStatus = ElasticService.clusterHealth.status;
            $scope.clusterName = ElasticService.clusterHealth.cluster_name;
            $scope.fetchedAt = ElasticService.clusterHealth.fetched_at;
          } else {
            $scope.clusterStatus = undefined;
            $scope.clusterName = undefined;
            $scope.fetchedAt = undefined;
          }
        }
    );

    $scope.handleConnectToHost = function(event) {
      if (event.keyCode == 13 && notEmpty($scope.new_host)) {
        $scope.connectToHost($scope.new_host);
      }
    };

    $scope.connectToHost = function(host) {
      try {
        ElasticService.connect(host);
        HostHistoryService.addToHistory(ElasticService.connection.host);
        $scope.host_history = HostHistoryService.getHostHistory();
      } catch (error) {
        AlertService.error('Error while connecting to new target host', error);
      } finally {
        $scope.current_host = ElasticService.connection.host;
        ElasticService.refresh();
      }
    };

    $scope.changeRefresh = function() {
      SettingsService.setRefreshInterval($scope.new_refresh);
    };

    $scope.changeTheme = function() {
      ThemeService.setTheme($scope.theme);
    };

  }
]);

kopf.controller('NodesController', ['$scope', 'ConfirmDialogService',
  'AlertService', 'ElasticService', 'NodesFilter',
  function($scope, ConfirmDialogService, AlertService, ElasticService,
           NodesFilter) {

    $scope.cluster = undefined;

    $scope.filter = NodesFilter.filter;

    $scope.nodes = [];

    $scope.$watch('filter',
        function(filter, previous) {
          if (isDefined(ElasticService.cluster)) {
            $scope.setNodes(ElasticService.cluster.getNodes(true));
          } else {
            $scope.setNodes([]);
          }
        },
        true);

    $scope.$watch(
        function() {
          return ElasticService.cluster;
        },
        function(newValue, oldValue) {
          if (isDefined(ElasticService.cluster)) {
            $scope.cluster = ElasticService.cluster;
            $scope.setNodes(ElasticService.cluster.getNodes(true));
          } else {
            $scope.cluster = undefined;
            $scope.setNodes([]);
          }
        }
    );

    $scope.setNodes = function(nodes) {
      $scope.nodes = nodes.filter(function(node) {
        return $scope.filter.matches(node);
      });
    };

  }

]);

kopf.controller('PercolatorController', ['$scope', 'ConfirmDialogService',
  'AlertService', 'AceEditorService', 'ElasticService',
  function($scope, ConfirmDialogService, AlertService, AceEditorService,
           ElasticService) {
    $scope.editor = undefined;
    $scope.pagination = new PercolatorsPage(0, 0, 0, []);

    $scope.filter = '';
    $scope.id = '';

    $scope.index = null;
    $scope.indices = [];
    $scope.new_query = new PercolateQuery({});

    $scope.$watch(
        function() {
          return ElasticService.cluster;
        },
        function(filter, previous) {
          $scope.indices = ElasticService.getIndices();
        },
        true
    );

    $scope.initEditor = function() {
      if (!angular.isDefined($scope.editor)) {
        $scope.editor = AceEditorService.init('percolator-query-editor');
      }
    };

    $scope.previousPage = function() {
      $scope.loadPercolatorQueries(this.pagination.previousOffset());
    };

    $scope.nextPage = function() {
      $scope.loadPercolatorQueries(this.pagination.nextOffset());
    };

    $scope.parseSearchParams = function() {
      var queries = [];
      var id = $scope.id;
      if (id.trim().length > 0) {
        queries.push({'query_string': {default_field: '_id', query: id}});
      }
      if ($scope.filter.trim().length > 0) {
        var filter = JSON.parse($scope.filter);
        Object.keys(filter).forEach(function(field) {
          var q = {};
          q[field] = filter[field];
          queries.push({'term': q});
        });
      }
      return queries;
    };

    $scope.deletePercolatorQuery = function(query) {
      ConfirmDialogService.open('are you sure you want to delete query ' +
              query.id + ' for index ' + query.index + '?',
          query.sourceAsJSON(),
          'Delete',
          function() {
            ElasticService.deletePercolatorQuery(query.index, query.id,
                function(response) {
                  var refreshIndex = query.index;
                  ElasticService.refreshIndex(refreshIndex,
                      function(response) {
                        AlertService.success('Query successfully deleted',
                            response);
                        $scope.loadPercolatorQueries();
                      },
                      function(error) {
                        AlertService.error('Error while reloading queries',
                            error);
                      }
                  );
                },
                function(error) {
                  AlertService.error('Error while deleting query', error);
                }
            );
          }
      );
    };

    $scope.createNewQuery = function() {
      if (!notEmpty($scope.new_query.index) || !notEmpty($scope.new_query.id)) {
        AlertService.error('Both index and query id must be specified');
        return;
      }

      $scope.new_query.source = $scope.editor.format();
      if (isDefined($scope.editor.error)) {
        AlertService.error('Invalid percolator query');
        return;
      }

      if (!notEmpty($scope.new_query.source)) {
        AlertService.error('Query must be defined');
        return;
      }
      ElasticService.createPercolatorQuery($scope.new_query,
          function(response) {
            var refreshIndex = $scope.new_query.index;
            ElasticService.refreshIndex(refreshIndex,
                function(response) {
                  AlertService.success('Percolator Query successfully created',
                      response);
                  $scope.index = $scope.new_query.index;
                  $scope.loadPercolatorQueries(0);
                },
                function(error) {
                  AlertService.success('Error while reloading queries', error);
                }
            );
          },
          function(error) {
            AlertService.error('Error while creating percolator query', error);
          }
      );
    };

    $scope.searchPercolatorQueries = function() {
      if (isDefined($scope.index)) {
        $scope.loadPercolatorQueries();
      } else {
        AlertService.info('No index is selected');
      }
    };

    $scope.loadPercolatorQueries = function(from) {
      try {
        from = isDefined(from) ? from : 0;
        var queries = $scope.parseSearchParams();
        var body = {from: from, size: 10};
        if (queries.length > 0) {
          body.query = {bool: {must: queries}};
        }
        ElasticService.fetchPercolateQueries($scope.index, body,
            function(percolators) {
              $scope.pagination = percolators;
            },
            function(error) {
              AlertService.error('Error loading percolate queries', error);
            }
        );
      } catch (error) {
        AlertService.error('Filter is not a valid JSON');
      }
    };

    $scope.initializeController = function() {
      $scope.indices = ElasticService.getIndices();
      $scope.initEditor();
    };

  }
]);

kopf.controller('RestController', ['$scope', '$location', '$timeout',
  'AlertService', 'AceEditorService', 'ElasticService',
  function($scope, $location, $timeout, AlertService, AceEditorService,
           ElasticService) {

    $scope.request = new Request('/_search', 'GET', '{}');

    $scope.validation_error = null;

    $scope.history = [];

    $scope.editor = null;

    $scope.loadHistory = function() {
      var history = [];
      var rawHistory = localStorage.getItem('kopf_request_history');
      if (isDefined(rawHistory)) {
        try {
          JSON.parse(rawHistory).forEach(function(h) {
            history.push(new Request().loadFromJSON(h));
          });
        } catch (error) {
          localStorage.setItem('kopf_request_history', null);
        }
      }
      return history;
    };

    $scope.loadFromHistory = function(request) {
      $scope.request.path = request.path;
      $scope.request.body = request.body;
      $scope.request.method = request.method;
      $scope.editor.setValue(request.body);
    };

    $scope.addToHistory = function(request) {
      var exists = false;
      for (var i = 0; i < $scope.history.length; i++) {
        if ($scope.history[i].equals(request)) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        $scope.history.unshift(request);
        if ($scope.history.length > 30) {
          $scope.history.length = 30;
        }
        var historyRaw = JSON.stringify($scope.history);
        localStorage.setItem('kopf_request_history', historyRaw);
      }
    };

    $scope.sendRequest = function() {
      if (notEmpty($scope.request.path)) {
        $scope.request.body = $scope.editor.format();
        $('#rest-client-response').html('');
        if ($scope.request.method == 'GET' && '{}' !== $scope.request.body) {
          AlertService.info('You are executing a GET request with body ' +
              'content. Maybe you meant to use POST or PUT?');
        }
        ElasticService.clusterRequest($scope.request.method,
            $scope.request.path, $scope.request.body,
            function(response) {
              var content = response;
              try {
                content = JSONTree.create(response);
              } catch (error) {
                // nothing to do
              }
              $('#rest-client-response').html(content);
              $scope.addToHistory(new Request($scope.request.path,
                  $scope.request.method, $scope.request.body));
            },
            function(error, status) {
              if (status !== 0) {
                AlertService.error('Request was not successful');
                try {
                  $('#rest-client-response').html(JSONTree.create(error));
                } catch (invalidJsonError) {
                  $('#rest-client-response').html(error);
                }
              } else {
                var url = ElasticService.connection.host + $scope.request.path;
                AlertService.error(url + ' is unreachable');
              }
            }
        );
      } else {
        AlertService.warn('Path is empty');
      }
    };

    $scope.initEditor = function() {
      if (!isDefined($scope.editor)) {
        $scope.editor = AceEditorService.init('rest-client-editor');
        $scope.editor.setValue($scope.request.body);
      }
    };

    $scope.initializeController = function() {
      $scope.initEditor();
      $scope.history = $scope.loadHistory();
    };

  }

]);

kopf.controller('SnapshotController', ['$scope', 'ConfirmDialogService',
  'AlertService', 'ElasticService',
  function($scope, ConfirmDialogService, AlertService, ElasticService) {
    // registered snapshot
    $scope.showSpecialIndices = false;
    $scope.repositories = [];
    $scope.indices = [];

    $scope.paginator = new Paginator(1, 10, [], new SnapshotFilter());
    $scope.page = $scope.paginator.getPage();
    $scope.snapshots = [];

    $scope.snapshot = null;
    $scope.snapshot_repository = '';

    $scope.restorable_indices = [];
    $scope.repository_form = new Repository('', {settings: {}, type: ''});
    $scope.new_snap = {};
    $scope.restore_snap = {};
    $scope.editor = undefined;

    $scope.$watch('showSpecialIndices', function(current, previous) {
      $scope.loadIndices();
    });

    $scope.$watch(
        function() {
          return ElasticService.cluster;
        },
        function(filter, previous) {
          $scope.loadIndices();
        },
        true
    );

    $scope.loadIndices = function() {
      var indices = $scope.indices = ElasticService.getIndices();
      if (!$scope.showSpecialIndices) {
        indices = indices.filter(function(idx) { return !idx.special; });
      }
      $scope.indices = indices;
    };

    $scope.$watch('paginator', function(filter, previous) {
      $scope.page = $scope.paginator.getPage();
    }, true);

    $scope.reload = function() {
      $scope.loadIndices();
      $scope.loadRepositories();
      if (notEmpty($scope.snapshot_repository)) {
        $scope.fetchSnapshots($scope.snapshot_repository);
      }
    };

    $scope.optionalParam = function(body, object, paramname) {
      if (angular.isDefined(object[paramname])) {
        body[paramname] = object[paramname];
      }
      return body;
    };

    $scope.executeDeleteRepository = function(repository) {
      ElasticService.deleteRepository(repository.name,
          function(response) {
            AlertService.success('Repository successfully deleted', response);
            if (notEmpty($scope.snapshot_repository) &&
                $scope.snapshot_repository == repository.name) {
              $scope.snapshot_repository = '';
            }
            $scope.reload();
          },
          function(error) {
            AlertService.error('Error while deleting repositor', error);
          }
      );
    };

    $scope.deleteRepository = function(repository) {
      ConfirmDialogService.open('are you sure you want to delete repository ' +
              repository.name + '?',
          repository.settings,
          'Delete',
          function() {
            $scope.executeDeleteRepository(repository);
          }
      );
    };

    $scope.restoreSnapshot = function() {
      var body = {};
      // dont add to body if not present, these are optional, all indices included by default
      if (angular.isDefined($scope.restore_snap.indices) &&
          $scope.restore_snap.indices.length > 0) {
        body.indices = $scope.restore_snap.indices.join(',');
      }

      if (angular.isDefined($scope.restore_snap.include_global_state)) {
        body.include_global_state = $scope.restore_snap.include_global_state;
      }

      $scope.optionalParam(body, $scope.restore_snap, 'ignore_unavailable');
      $scope.optionalParam(body, $scope.restore_snap, 'rename_replacement');
      $scope.optionalParam(body, $scope.restore_snap, 'rename_pattern');

      ElasticService.restoreSnapshot($scope.snapshot_repository,
          $scope.snapshot.name, JSON.stringify(body),
          function(response) {
            AlertService.success('Snapshot Restored Started');
            $scope.reload();
          },
          function(error) {
            AlertService.error('Error while started restore of snapshot',
                error);
          }
      );
    };

    $scope.createRepository = function() {
      try {
        $scope.repository_form.validate();
        ElasticService.createRepository($scope.repository_form.name,
            $scope.repository_form.asJson(),
            function(response) {
              AlertService.success('Repository created');
              $scope.loadRepositories();
            },
            function(error) {
              AlertService.error('Error while creating repository', error);
            }
        );
      } catch (error) {
        AlertService.error(error);
      }
    };

    $scope.loadRepositories = function() {
      ElasticService.getRepositories(
          function(response) {
            $scope.repositories = response;
          },
          function(error) {
            $scope.repositories = [];
            AlertService.error('Error while reading snapshot', error);
          }
      );
    };

    $scope.createSnapshot = function() {
      var body = {};

      // name and repo required
      if (!isDefined($scope.new_snap.repository)) {
        AlertService.warn('Repository is required');
        return;
      }

      if (!isDefined($scope.new_snap.name)) {
        AlertService.warn('Snapshot name is required');
        return;
      }

      // dont add to body if not present, these are optional, all indices included by default
      if (isDefined($scope.new_snap.indices) &&
          $scope.new_snap.indices.length > 0) {
        body.indices = $scope.new_snap.indices.join(',');
      }

      if (isDefined($scope.new_snap.include_global_state)) {
        body.include_global_state = $scope.new_snap.include_global_state;
      }

      $scope.optionalParam(body, $scope.new_snap, 'ignore_unavailable');

      ElasticService.createSnapshot($scope.new_snap.repository.name,
          $scope.new_snap.name, JSON.stringify(body),
          function(response) {
            AlertService.success('Snapshot created');
            $scope.reload();
          },
          function(error) {
            AlertService.error('Error while creating snapshot', error);
          }
      );
    };

    $scope.deleteSnapshot = function(snapshot) {
      ConfirmDialogService.open(
              'are you sure you want to delete snapshot ' + snapshot.name + '?',
          snapshot,
          'Delete',
          function() {
            ElasticService.deleteSnapshot(
                $scope.snapshot_repository,
                snapshot.name,
                function(response) {
                  AlertService.success('Snapshot successfully deleted',
                      response);
                  $scope.reload();
                },
                function(error) {
                  AlertService.error('Error while deleting snapshot', error);
                }
            );
          }
      );
    };

    $scope.fetchSnapshots = function(repository) {
      ElasticService.getSnapshots(repository,
          function(response) {
            $scope.paginator.setCollection(response);
            $scope.page = $scope.paginator.getPage();
          },
          function(error) {
            $scope.paginator.setCollection([]);
            $scope.page = $scope.paginator.getPage();
            AlertService.error('Error while fetching snapshots', error);
          }
      );
    };

    $scope.selectSnapshot = function(snapshot) {
      $scope.snapshot = snapshot;
    };

    $scope.unselectSnapshot = function() {
      $scope.snapshot = null;
    };

    $scope.selectRepository = function(repository) {
      $scope.snapshot_repository = repository;
      $scope.fetchSnapshots(repository);
    };

    $scope.initializeController = function() {
      $scope.snapshot = null; // clear 'active' snapshot
      $scope.reload();
    };

  }
]);

kopf.controller('WarmersController', [
  '$scope', 'ConfirmDialogService', 'AlertService', 'AceEditorService',
  'ElasticService',
  function($scope, ConfirmDialogService, AlertService, AceEditorService,
           ElasticService) {
    $scope.editor = undefined;
    $scope.indices = [];
    $scope.index = null;
    $scope.paginator = new Paginator(1, 10, [], new WarmerFilter(''));
    $scope.page = $scope.paginator.getPage();

    $scope.warmer = new Warmer('', '', {types: [], source: {}});

    $scope.warmers = [];

    $scope.$watch(
        function() {
          return ElasticService.cluster;
        },
        function(filter, previous) {
          $scope.indices = ElasticService.getIndices();
        },
        true
    );

    $scope.$watch('paginator', function(filter, previous) {
      $scope.page = $scope.paginator.getPage();
    }, true);

    $scope.initEditor = function() {
      if (!angular.isDefined($scope.editor)) {
        $scope.editor = AceEditorService.init('warmer-editor');
      }
    };

    $scope.createWarmer = function() {
      if ($scope.editor.hasContent()) {
        $scope.editor.format();
        if (!isDefined($scope.editor.error)) {
          $scope.warmer.source = $scope.editor.getValue();
          ElasticService.registerWarmer($scope.warmer,
              function(response) {
                $scope.loadIndexWarmers();
                AlertService.success('Warmer successfully created', response);
              },
              function(error) {
                AlertService.error('Request returned invalid JSON', error);
              }
          );
        }
      } else {
        AlertService.error('Warmer query can\'t be empty');
      }
    };

    $scope.deleteWarmer = function(warmer) {
      ConfirmDialogService.open(
          'are you sure you want to delete warmer ' + warmer.id + '?',
          warmer.source,
          'Delete',
          function() {
            ElasticService.deleteWarmer(warmer, // FIXME: better send name + id
                function(response) {
                  AlertService.success('Warmer successfully deleted', response);
                  $scope.loadIndexWarmers();
                },
                function(error) {
                  AlertService.error('Error while deleting warmer', error);
                }
            );
          }
      );
    };

    $scope.loadIndexWarmers = function() {
      if (isDefined($scope.index)) {
        ElasticService.getIndexWarmers($scope.index, '',
            function(warmers) {
              $scope.paginator.setCollection(warmers);
              $scope.page = $scope.paginator.getPage();
            },
            function(error) {
              $scope.paginator.setCollection([]);
              $scope.page = $scope.paginator.getPage();
              AlertService.error('Error while fetching warmers', error);
            }
        );
      } else {
        $scope.paginator.setCollection([]);
        $scope.page = $scope.paginator.getPage();
      }
    };

    $scope.initializeController = function() {
      $scope.indices = ElasticService.getIndices();
      $scope.initEditor();
    };

  }
]);

kopf.directive('ngNavbarSection', ['$location', 'ElasticService',
  function($location, ElasticService) {

    function link(scope, elem, attrs) {
      scope.$watch(
          function() {
            return $location.path();
          },
          function() {
            var name = attrs.name;
            var active = name === $location.path().substring(1);
            if (active) {
              elem.addClass('active');
            } else {
              elem.removeClass('active');
            }
          }
      );
    }

    return {
      link: link,
      template: function(elem, attrs) {
        var visible = ElasticService.versionCheck(attrs.version);
        if (visible) {
          var name = attrs.name;
          var icon = attrs.icon;
          var active = name === $location.path().substring(1);
          if (active) {
            elem.addClass('active');
          }
          return '<a href="#!' + name + '">' +
              '<i class="fa fa-fw ' + icon + '"></i> ' + name +
              '</a>';
        } else {
          return '';
        }
      }
    };
  }

]);

kopf.directive('ngPagination', function() {
  return {
    scope: {
      paginator: '=paginator',
      page: '=page'
    },
    templateUrl: './partials/directives/pagination.html'
  };
});

kopf.directive('ngStaticInclude', function() {
  return {
    templateUrl: function(elem, attr) {
      return './partials/' + attr.file + '.html';
    }
  };
});

function IndexAliases(index, aliases) {
  this.index = index;
  this.aliases = aliases;

  this.clone = function() {
    var cloned = new IndexAliases(this.index, []);
    cloned.aliases = this.aliases.map(function(alias) {
      return alias.clone();
    });
    return cloned;
  };
}

IndexAliases.diff = function(original, modified) {
  var differences = [];
  modified.forEach(function(ia) {
    var isNew = true;
    original.forEach(function(origIA) {
      if (ia.index == origIA.index) {
        isNew = false;
        ia.aliases.forEach(function(alias) {
          var originalAliases = origIA.aliases.filter(function(originalAlias) {
            return alias.equals(originalAlias);
          });
          if (originalAliases.length === 0) {
            differences.push(alias);
          }
        });
      }
    });
    if (isNew) {
      ia.aliases.forEach(function(alias) {
        differences.push(alias);
      });
    }
  });
  return differences;
};

function Alias(alias, index, filter, indexRouting, searchRouting) {
  this.alias = isDefined(alias) ? alias.toLowerCase() : '';
  this.index = isDefined(index) ? index.toLowerCase() : '';
  this.filter = isDefined(filter) ? filter : '';
  this.index_routing = isDefined(indexRouting) ? indexRouting : '';
  this.search_routing = isDefined(searchRouting) ? searchRouting : '';

  this.validate = function() {
    if (!notEmpty(this.alias)) {
      throw 'Alias must have a non empty name';
    }
    if (!notEmpty(this.index)) {
      throw 'Alias must have a valid index name';
    }
  };

  this.equals = function(otherAlias) {
    var equal =
        (this.alias === otherAlias.alias) &&
        (this.index === otherAlias.index) &&
        (this.filter === otherAlias.filter) &&
        (this.index_routing === otherAlias.index_routing) &&
        (this.search_routing === otherAlias.search_routing);
    return equal;
  };

  this.info = function() {
    var info = {};
    info.index = this.index;
    info.alias = this.alias;

    if (isDefined(this.filter)) {
      if (typeof this.filter == 'string' && notEmpty(this.filter)) {
        info.filter = JSON.parse(this.filter);
      } else {
        info.filter = this.filter;
      }
    }
    if (notEmpty(this.index_routing)) {
      info.index_routing = this.index_routing;
    }
    if (notEmpty(this.search_routing)) {
      info.search_routing = this.search_routing;
    }
    return info;
  };

  this.clone = function() {
    return new Alias(this.alias, this.index, this.filter, this.index_routing,
        this.search_routing);
  };
}

function Cluster(state, status, nodes, settings, aliases) {
  this.created_at = new Date().getTime();

  this.name = state.cluster_name;
  this.master_node = state.master_node;

  this.disableAllocation = 'false';
  var persistentAllocation = getProperty(settings,
      'persistent.cluster.routing.allocation.enable', 'all');

  var transientAllocation = getProperty(settings,
      'transient.cluster.routing.allocation.enable', '');

  if (transientAllocation !== '') {
    this.disableAllocation = transientAllocation == 'all' ? 'false' : 'true';
  } else {
    if (persistentAllocation != 'all') {
      this.disableAllocation = 'true';
    }
  }

  this.settings = settings;

  var totalSize = 0;
  var numDocs = 0;

  this.nodes = Object.keys(state.nodes).map(function(nodeId) {
    var nodeState = state.nodes[nodeId];
    var nodeStats = nodes.nodes[nodeId];
    var node = new Node(nodeId, nodeState, nodeStats);
    if (nodeId === state.master_node) {
      node.setCurrentMaster();
    }
    return node;
  });

  this.getNodes = function(considerType) {
    return this.nodes.sort(function(a, b) {
      return a.compare(b, considerType);
    });
  };

  this.number_of_nodes = this.nodes.length;

  var iRoutingTable = state.routing_table.indices;
  var iStatus = status.indices;
  var specialIndices = 0;
  this.indices = Object.keys(iRoutingTable).map(function(indexName) {
    var indexInfo = iRoutingTable[indexName];
    var indexStatus = iStatus[indexName];
    var indexAliases = aliases[indexName];
    var index = new Index(indexName, state, indexInfo, indexStatus,
        indexAliases);
    if (index.special) {
      specialIndices++;
    }
    totalSize += parseInt(index.total_size);
    numDocs += index.num_docs;
    return index;
  });

  if (isDefined(state.blocks.indices)) {
    var indices = this.indices;
    Object.keys(state.blocks.indices).forEach(function(indexName) {
      // INDEX_CLOSED_BLOCK = new ClusterBlock(4, "index closed", ...
      if (state.blocks.indices[indexName]['4']) {
        indices.push(new Index(indexName));
      }
    });
  }
  this.indices = this.indices.sort(function(a, b) {
    return a.compare(b);
  });

  this.special_indices = specialIndices;
  this.num_docs = numDocs;
  this.total_indices = this.indices.length;

  this.shards = status._shards.total;
  this.failed_shards = status._shards.failed;
  this.successful_shards = status._shards.successful;
  this.unassigned_shards = state.routing_nodes.unassigned.length;

  this.total_size = readablizeBytes(totalSize);
  this.total_size_in_bytes = totalSize;
  this.changes = null;

  this.computeChanges = function(oldCluster) {
    var nodes = this.nodes;
    var indices = this.indices;
    var changes = new ClusterChanges();
    if (isDefined(oldCluster) && this.name === oldCluster.name) {
      // checks for node differences
      oldCluster.nodes.forEach(function(node) {
        for (var i = 0; i < nodes.length; i++) {
          if (nodes[i].equals(node)) {
            node = null;
            break;
          }
        }
        if (isDefined(node)) {
          changes.addLeavingNode(node);
        }
      });

      if (oldCluster.nodes.length != nodes.length || !changes.hasJoins()) {
        nodes.forEach(function(node) {
          for (var i = 0; i < oldCluster.nodes.length; i++) {
            if (oldCluster.nodes[i].equals(node)) {
              node = null;
              break;
            }
          }
          if (isDefined(node)) {
            changes.addJoiningNode(node);
          }
        });
      }

      // checks for indices differences
      oldCluster.indices.forEach(function(index) {
        for (var i = 0; i < indices.length; i++) {
          if (indices[i].equals(index)) {
            index = null;
            break;
          }
        }
        if (isDefined(index)) {
          changes.addDeletedIndex(index);
        }
      });

      var equalNumberOfIndices = oldCluster.indices.length != indices.length;
      if (equalNumberOfIndices || !changes.hasCreatedIndices()) {
        indices.forEach(function(index) {
          for (var i = 0; i < oldCluster.indices.length; i++) {
            if (oldCluster.indices[i].equals(index)) {
              index = null;
              break;
            }
          }
          if (isDefined(index)) {
            changes.addCreatedIndex(index);
          }
        });
      }
      var docDelta = this.num_docs - oldCluster.num_docs;
      // var docRate = docDelta / ((this.created_at - old_cluster.created_at) / 1000);
      changes.setDocDelta(docDelta);
      var dataDelta = this.total_size_in_bytes - oldCluster.total_size_in_bytes;
      changes.setDataDelta(dataDelta);
    }
    this.changes = changes;
  };

  this.open_indices = function() {
    return $.map(this.indices, function(index) {
      if (index.state == 'open') {
        return index;
      } else {
        return null;
      }
    });
  };

}

function ClusterChanges() {

  this.nodeJoins = null;
  this.nodeLeaves = null;
  this.indicesCreated = null;
  this.indicesDeleted = null;

  this.docDelta = 0;
  this.dataDelta = 0;

  this.setDocDelta = function(delta) {
    this.docDelta = delta;
  };

  this.getDocDelta = function() {
    return this.docDelta;
  };

  this.absDocDelta = function() {
    return Math.abs(this.docDelta);
  };

  this.absDataDelta = function() {
    return readablizeBytes(Math.abs(this.dataDelta));
  };

  this.getDataDelta = function() {
    return this.dataDelta;
  };

  this.setDataDelta = function(delta) {
    this.dataDelta = delta;
  };

  this.hasChanges = function() {
    return (
      isDefined(this.nodeJoins) ||
      isDefined(this.nodeLeaves) ||
      isDefined(this.indicesCreated) ||
      isDefined(this.indicesDeleted)
      );
  };

  this.addJoiningNode = function(node) {
    this.changes = true;
    if (!isDefined(this.nodeJoins)) {
      this.nodeJoins = [];
    }
    this.nodeJoins.push(node);
  };

  this.addLeavingNode = function(node) {
    this.changes = true;
    if (!isDefined(this.nodeLeaves)) {
      this.nodeLeaves = [];
    }
    this.nodeLeaves.push(node);
  };

  this.hasJoins = function() {
    return isDefined(this.nodeJoins);
  };

  this.hasLeaves = function() {
    return isDefined(this.nodeLeaves);
  };

  this.hasCreatedIndices = function() {
    return isDefined(this.indicesCreated);
  };

  this.hasDeletedIndices = function() {
    return isDefined(this.indicesDeleted);
  };

  this.addCreatedIndex = function(index) {
    if (!isDefined(this.indicesCreated)) {
      this.indicesCreated = [];
    }
    this.indicesCreated.push(index);
  };

  this.addDeletedIndex = function(index) {
    if (!isDefined(this.indicesDeleted)) {
      this.indicesDeleted = [];
    }
    this.indicesDeleted.push(index);
  };

}

function ClusterHealth(health) {
  this.status = health.status;
  this.cluster_name = health.cluster_name;
  this.initializing_shards = health.initializing_shards;
  this.active_primary_shards = health.active_primary_shards;
  this.active_shards = health.active_shards;
  this.relocating_shards = health.relocating_shards;
  this.unassigned_shards = health.unassigned_shards;
  this.number_of_nodes = health.number_of_nodes;
  this.number_of_data_nodes = health.number_of_data_nodes;
  this.timed_out = health.timed_out;
  this.shards = this.active_shards + this.relocating_shards +
      this.unassigned_shards + this.initializing_shards;
  this.fetched_at = getTimeString(new Date());
}

function ClusterSettings(settings) {
  // FIXME: 0.90/1.0 check
  var valid = [
    // cluster
    'cluster.blocks.read_only',
    'indices.ttl.interval',
    'indices.cache.filter.size',
    'discovery.zen.minimum_master_nodes',
    // recovery
    'indices.recovery.concurrent_streams',
    'indices.recovery.compress',
    'indices.recovery.file_chunk_size',
    'indices.recovery.translog_ops',
    'indices.recovery.translog_size',
    'indices.recovery.max_bytes_per_sec',
    // routing
    'cluster.routing.allocation.node_initial_primaries_recoveries',
    'cluster.routing.allocation.cluster_concurrent_rebalance',
    'cluster.routing.allocation.awareness.attributes',
    'cluster.routing.allocation.node_concurrent_recoveries',
    'cluster.routing.allocation.disable_allocation',
    'cluster.routing.allocation.disable_replica_allocation'
  ];
  var instance = this;
  ['persistent', 'transient'].forEach(function(type) {
    instance[type] = {};
    var currentSettings = settings[type];
    valid.forEach(function(setting) {
      instance[type][setting] = getProperty(currentSettings, setting);
    });
  });
}

function EditableIndexSettings(settings) {
  // FIXME: 0.90/1.0 check
  this.valid_settings = [
    // blocks
    'index.blocks.read_only',
    'index.blocks.read',
    'index.blocks.write',
    'index.blocks.metadata',
    // cache
    'index.cache.filter.max_size',
    'index.cache.filter.expire',
    // index
    'index.number_of_replicas',
    'index.index_concurrency',
    'index.warmer.enabled',
    'index.refresh_interval',
    'index.term_index_divisor',
    'index.ttl.disable_purge',
    'index.fail_on_merge_failure',
    'index.gc_deletes',
    'index.codec',
    'index.compound_on_flush',
    'index.term_index_interval',
    'index.auto_expand_replicas',
    'index.recovery.initial_shards',
    'index.compound_format',
    // routing
    'index.routing.allocation.disable_allocation',
    'index.routing.allocation.disable_new_allocation',
    'index.routing.allocation.disable_replica_allocation',
    'index.routing.allocation.total_shards_per_node',
    // slowlog
    'index.search.slowlog.threshold.query.warn',
    'index.search.slowlog.threshold.query.info',
    'index.search.slowlog.threshold.query.debug',
    'index.search.slowlog.threshold.query.trace',
    'index.search.slowlog.threshold.fetch.warn',
    'index.search.slowlog.threshold.fetch.info',
    'index.search.slowlog.threshold.fetch.debug',
    'index.search.slowlog.threshold.fetch.trace',
    'index.indexing.slowlog.threshold.index.warn',
    'index.indexing.slowlog.threshold.index.info',
    'index.indexing.slowlog.threshold.index.debug',
    'index.indexing.slowlog.threshold.index.trace',
    // translog
    'index.translog.flush_threshold_ops',
    'index.translog.flush_threshold_size',
    'index.translog.flush_threshold_period',
    'index.translog.disable_flush',
    'index.translog.fs.type'
  ];
  var instance = this;
  this.valid_settings.forEach(function(setting) {
    instance[setting] = getProperty(settings, setting);
  });
}


// Expects URL according to /^(https|http):\/\/(\w+):(\w+)@(.*)/i;
// Examples:
// http://localhost:9200
// http://user:password@localhost:9200
// https://localhost:9200
function ESConnection(url, withCredentials) {
  if (url.indexOf('http://') !== 0 && url.indexOf('https://') !== 0) {
    url = 'http://' + url;
  }
  var protectedUrl = /^(https|http):\/\/(\w+):(\w+)@(.*)/i;
  this.host = 'http://localhost:9200'; // default
  this.withCredentials = withCredentials;
  if (notEmpty(url)) {
    var connectionParts = protectedUrl.exec(url);
    if (isDefined(connectionParts)) {
      this.host = connectionParts[1] + '://' + connectionParts[4];
      this.username = connectionParts[2];
      this.password = connectionParts[3];
      this.auth = 'Basic ' + window.btoa(this.username + ':' + this.password);
    } else {
      this.host = url;
    }
  }

}

function Index(indexName, clusterState, indexInfo, indexStatus, aliases) {
  this.name = indexName;
  this.shards = null;
  this.metadata = {};
  this.state = 'close';
  this.num_of_shards = 0;
  this.num_of_replicas = 0;
  this.aliases = [];
  if (isDefined(aliases)) {
    var indexAliases = aliases.aliases;
    if (isDefined(indexAliases)) {
      this.aliases = Object.keys(aliases.aliases);
    }
  }

  this.visibleAliases = function() {
    return this.aliases.length > 5 ? this.aliases.slice(0, 5) : this.aliases;
  };

  if (isDefined(clusterState)) {
    var routing = getProperty(clusterState, 'routing_table.indices');
    this.state = 'open';
    if (isDefined(routing)) {
      var shards = Object.keys(routing[indexName].shards);
      this.num_of_shards = shards.length;
      var shardMap = routing[indexName].shards;
      this.num_of_replicas = shardMap[0].length - 1;
    }
  }
  this.num_docs = getProperty(indexStatus, 'docs.num_docs', 0);
  this.max_doc = getProperty(indexStatus, 'docs.max_doc', 0);
  this.deleted_docs = getProperty(indexStatus, 'docs.deleted_docs', 0);
  this.size = getProperty(indexStatus, 'index.primary_size_in_bytes', 0);
  this.total_size = getProperty(indexStatus, 'index.size_in_bytes', 0);
  this.size_in_bytes = readablizeBytes(this.size);
  this.total_size_in_bytes = readablizeBytes(this.total_size);

  this.unassigned = [];
  this.unhealthy = false;

  this.getShards = function(nodeId) {
    if (isDefined(indexInfo)) {
      if (this.shards === null) {
        var indexShards = {};
        var unassigned = [];
        this.unassigned = unassigned;
        $.map(indexInfo.shards, function(shards, shardNum) {
          $.map(shards, function(shardRouting, shardCopy) {
            if (shardRouting.node === null) {
              unassigned.push(new UnassignedShard(shardRouting));
            } else {
              if (!isDefined(indexShards[shardRouting.node])) {
                indexShards[shardRouting.node] = [];
              }
              var shardStatus = null;
              if (isDefined(indexStatus) &&
                  isDefined(indexStatus.shards[shardRouting.shard])) {
                indexStatus.shards[shardRouting.shard].forEach(
                    function(status) {
                      if (status.routing.node == shardRouting.node &&
                          status.routing.shard == shardRouting.shard) {
                        shardStatus = status;
                      }
                    });
              }
              var newShard = new Shard(shardRouting, shardStatus);
              indexShards[shardRouting.node].push(newShard);
            }
          });
        });
        this.shards = indexShards;
      }
    } else {
      this.shards = {};
    }
    return this.shards[nodeId];
  };

  if (isDefined(clusterState) && isDefined(clusterState.routing_table)) {
    var instance = this;
    var shardsMap = clusterState.routing_table.indices[this.name].shards;
    Object.keys(shardsMap).forEach(function(shardNum) {
      shardsMap[shardNum].forEach(function(shard) {
        if (shard.state != 'STARTED') {
          instance.unhealthy = true;
        }
      });
    });
  }

  this.special = this.name.indexOf('.') === 0 || this.name.indexOf('_') === 0;

  this.compare = function(b) { // TODO: take into account index properties?
    return this.name.localeCompare(b.name);
  };

  this.equals = function(index) {
    return index !== null && index.name == this.name;
  };

  this.closed = function() {
    return this.state === 'close';
  };

  this.open = function() {
    return this.state === 'open';
  };
}

function IndexMetadata(index, metadata) {
  this.index = index;
  this.mappings = metadata.mappings;
  this.settings = metadata.settings;

  this.getTypes = function() {
    return Object.keys(this.mappings).sort(function(a, b) {
      return a.localeCompare(b);
    });
  };

  this.getAnalyzers = function() {
    var analyzers = Object.keys(getProperty(this.settings,
        'index.analysis.analyzer', {}));
    if (analyzers.length === 0) {
      Object.keys(this.settings).forEach(function(setting) {
        if (setting.indexOf('index.analysis.analyzer') === 0) {
          var analyzer = setting.substring('index.analysis.analyzer.'.length);
          analyzer = analyzer.substring(0, analyzer.indexOf('.'));
          if ($.inArray(analyzer, analyzers) == -1) {
            analyzers.push(analyzer);
          }
        }
      });
    }
    return analyzers.sort(function(a, b) {
      return a.localeCompare(b);
    });
  };

  function isAnalyzable(type) {
    var analyzableTypes = ['float', 'double', 'byte', 'short', 'integer',
      'long', 'nested', 'object'
    ];
    return analyzableTypes.indexOf(type) == -1;
  }

  this.getFields = function(type) {
    var fields = [];
    if (isDefined(this.mappings[type])) {
      fields = this.getProperties('', this.mappings[type].properties);
    }
    return fields.sort(function(a, b) {
      return a.localeCompare(b);
    });
  };

  this.getProperties = function(parent, fields) {
    var prefix = parent !== '' ? parent + '.' : '';
    var validFields = [];
    for (var field in fields) {
      // multi field
      if (isDefined(fields[field].fields)) {
        var addPrefix = fields[field].path != 'just_name';
        var multiPrefix = addPrefix ? prefix + field : prefix;
        var multiProps = this.getProperties(multiPrefix, fields[field].fields);
        validFields = validFields.concat(multiProps);
      }
      // nested and object types
      var nestedType = fields[field].type == 'nested';
      var objectType = fields[field].type == 'object';
      if (nestedType || objectType || !isDefined(fields[field].type)) {
        var nestedProperties = this.getProperties(prefix + field,
            fields[field].properties);
        validFields = validFields.concat(nestedProperties);
      }
      // normal fields
      if (isDefined(fields[field].type) && isAnalyzable(fields[field].type)) {
        validFields.push(prefix + field);
      }
    }
    return validFields;
  };
}

function Node(nodeId, nodeInfo, nodeStats) {
  this.id = nodeId;
  this.name = nodeInfo.name;
  this.metadata = {};
  this.metadata.info = nodeInfo;
  this.metadata.stats = nodeStats;
  this.transport_address = nodeInfo.transport_address;
  this.host = nodeStats.host;
  var master = nodeInfo.attributes.master === 'false' ? false : true;
  var data = nodeInfo.attributes.data === 'false' ? false : true;
  var client = nodeInfo.attributes.client === 'true' ? true : false;
  this.master = master && !client;
  this.data = data && !client;
  this.client = client || !master && !data;
  this.current_master = false;
  this.stats = nodeStats;

  this.heap_used = readablizeBytes(getProperty(this.stats,
    'jvm.mem.heap_used_in_bytes'));

  this.heap_committed = readablizeBytes(getProperty(this.stats,
    'jvm.mem.heap_committed_in_bytes'));

  this.heap_used_percent = getProperty(this.stats, 'jvm.mem.heap_used_percent');

  this.heap_max = readablizeBytes(getProperty(this.stats,
    'jvm.mem.heap_max_in_bytes'));

  var totalInBytes = getProperty(this.stats, 'fs.total.total_in_bytes');
  var freeInBytes = getProperty(this.stats, 'fs.total.free_in_bytes');

  this.disk_total = readablizeBytes(totalInBytes);
  this.disk_free = readablizeBytes(freeInBytes);
  var usedRatio = (totalInBytes - freeInBytes) / totalInBytes;
  this.disk_used_percent = Math.round(100 * usedRatio);

  this.cpu_user = getProperty(this.stats, 'os.cpu.user');
  this.cpu_sys = getProperty(this.stats, 'os.cpu.sys');

  this.load_average = getProperty(this.stats, 'os.load_average');

  this.setCurrentMaster = function() {
    this.current_master = true;
  };

  this.equals = function(node) {
    return node.id === this.id;
  };

  this.compare = function(other, considerType) {
    if (considerType) {
      if (other.current_master) { return 1; } // current master comes first
      if (this.current_master) { return -1; } // current master comes first
      if (other.master && !this.master) { return 1; } // master eligible comes first
      if (this.master && !other.master) { return -1; } // master eligible comes first
      if (other.data && !this.data) { return 1; } // data node comes first
      if (this.data && !other.data) { return -1; } // data node comes first
    }
    return this.name.localeCompare(other.name); // if all the same, lex. sort
  };

}

function NodeStats(id, stats) {
  this.id = id;
  this.name = stats.name;
  this.stats = stats;
}

function PercolateQuery(queryInfo) {
  this.index = queryInfo._index;
  this.id = queryInfo._id;
  this.source = queryInfo._source;
  this.filter = {};

  this.sourceAsJSON = function() {
    try {
      return JSON.stringify(this.source, undefined, 2);
    } catch (error) {

    }
  };

  this.equals = function(other) {
    return (other instanceof PercolateQuery &&
      this.index == other.index &&
      this.id == other.id &&
      this.source == other.source);
  };
}

function PercolatorsPage(from, size, total, percolators) {
  this.from = from;
  this.size = size;
  this.total = total;
  this.percolators = percolators;

  this.hasNextPage = function() {
    return from + size < total;
  };

  this.hasPreviousPage = function() {
    return from > 0;
  };

  this.firstResult = function() {
    return total > 0 ? from + 1 : 0;
  };

  this.lastResult = function() {
    return this.hasNextPage() ? from + size : total;
  };

  this.nextOffset = function() {
    return this.hasNextPage() ? from + size : from;
  };

  this.previousOffset = function() {
    return this.hasPreviousPage() ? from - size : from;
  };

  this.getPage = function() {
    return percolators;
  };

  this.total = function() {
    return total;
  };
}

function Repository(name, info) {
  this.name = name;
  this.type = info.type;
  this.settings = info.settings;

  this.asJson = function() {
    var json = {type: this.type};
    if (this.type === 'fs') {
      var fsSettings = ['location', 'chunk_size', 'max_restore_bytes_per_sec',
        'max_snapshot_bytes_per_sec', 'compress'];
      json.settings = this.getSettings(fsSettings);
    }
    if (this.type === 'url') {
      var urlSettings = ['url'];
      json.settings = this.getSettings(urlSettings);
    }
    if (this.type === 's3') {
      var s3Settings = ['region', 'bucket', 'base_path', 'access_key',
        'secret_key', 'chunk_size', 'max_retries', 'compress',
        'server_side_encryption'
      ];
      json.settings = this.getSettings(s3Settings);
    }
    if (this.type === 'hdfs') {
      var hdfsSettings = ['uri', 'path', 'load_defaults', 'conf_location',
        'concurrent_streams', 'compress', 'chunk_size'];
      json.settings = this.getSettings(hdfsSettings);
    }
    if (this.type === 'azure') {
      var azureSettings = ['container', 'base_path', 'concurrent_streams',
        'chunk_size', 'compress'];
      json.settings = this.getSettings(azureSettings);
    }
    return JSON.stringify(json);
  };

  this.validate = function() {
    if (!notEmpty(this.name)) {
      throw 'Repository name is required';
    }
    if (!notEmpty(this.type)) {
      throw 'Repository type is required';
    }
    if (this.type === 'fs') {
      var fsRequired = ['location'];
      this.validateSettings(fsRequired);
    }
    if (this.type === 'url') {
      var urlRequired = ['url'];
      this.validateSettings(urlRequired);
    }
    if (this.type === 's3') {
      var s3Required = ['bucket'];
      this.validateSettings(s3Required);
    }
    if (this.type === 'hdfs') {
      var hdfsRequired = ['path'];
      this.validateSettings(hdfsRequired);
    }
  };

  this.validateSettings = function(required) {
    var repository = this;
    required.forEach(function(setting) {
      if (!notEmpty(repository.settings[setting])) {
        var type = repository.type;
        throw(setting + ' is required for snapshot of type ' + type);
      }
    });
  };

  this.getSettings = function(availableSettings) {
    var settings = {};
    var currentSettings = this.settings;
    availableSettings.forEach(function(setting) {
      if (notEmpty(currentSettings[setting])) {
        settings[setting] = currentSettings[setting];
      }
    });
    return settings;
  };
}

function Shard(routing, info) {
  this.info = isDefined(info) ? info : routing;
  this.primary = routing.primary;
  this.shard = routing.shard;
  this.state = routing.state;
  this.node = routing.node;
  this.index = routing.index;
  this.id = this.node + '_' + this.shard + '_' + this.index;
}

function UnassignedShard(info) {
  this.primary = info.primary;
  this.shard = info.shard;
  this.state = info.state;
  this.node = info.node;
  this.index = info.index;
  this.id = this.node + '_' + this.shard + '_' + this.index;
}

function Snapshot(info) {
  this.name = info.snapshot;
  this.indices = info.indices;
  this.state = info.state;
  this.start_time = info.start_time;
  this.start_time_in_millis = info.start_time_in_millis;
  this.end_time = info.end_time;
  this.end_time_in_millis = info.end_time_in_millis;
  this.duration_in_millis = info.duration_in_millis;
  this.failures = info.failures;
  this.shards = info.shards;
}

/** TYPES **/
function Token(token, startOffset, endOffset, position) {
  this.token = token;
  this.start_offset = startOffset;
  this.end_offset = endOffset;
  this.position = position;
}

function Warmer(id, index, body) {
  this.id = id;
  this.index = index;
  this.source = body.source;
  this.types = body.types;
}

function AceEditor(target) {
  // ace editor
  ace.config.set('basePath', 'dist/');
  this.editor = ace.edit(target);
  this.editor.setFontSize('10px');
  this.editor.setTheme('ace/theme/kopf');
  this.editor.getSession().setMode('ace/mode/json');

  // validation error
  this.error = null;

  // sets value and moves cursor to beggining
  this.setValue = function(value) {
    this.editor.setValue(value, 1);
    this.editor.gotoLine(0, 0, false);
  };

  this.getValue = function() {
    return this.editor.getValue();
  };

  // formats the json content
  this.format = function() {
    var content = this.editor.getValue();
    try {
      if (isDefined(content) && content.trim().length > 0) {
        this.error = null;
        content = JSON.stringify(JSON.parse(content), undefined, 4);
        this.editor.setValue(content, 0);
        this.editor.gotoLine(0, 0, false);
      }
    } catch (error) {
      this.error = error.toString();
    }
    return content;
  };

  this.hasContent = function() {
    return this.editor.getValue().trim().length > 0;
  };
}

function AliasFilter(index, alias) {

  this.index = index;
  this.alias = alias;

  this.clone = function() {
    return new AliasFilter(this.index, this.alias);
  };

  this.equals = function(other) {
    return (other !== null &&
      this.index == other.index &&
      this.alias == other.alias);
  };

  this.isBlank = function() {
    return !notEmpty(this.index) && !notEmpty(this.alias);
  };

  this.matches = function(indexAlias) {
    if (this.isBlank()) {
      return true;
    } else {
      var matches = true;
      if (notEmpty(this.index)) {
        matches = indexAlias.index.indexOf(this.index) != -1;
      }
      if (matches && notEmpty(this.alias)) {
        matches = false;
        var aliases = indexAlias.aliases;
        for (var i = 0; !matches && i < aliases.length; i++) {
          var alias = aliases[i];
          matches = alias.alias.indexOf(this.alias) != -1;
        }
      }
      return matches;
    }
  };

}

function Benchmark() {
  this.name = '';
  this.num_executor = 1;
  this.percentiles = '[10, 25, 50, 75, 90, 99]';
  this.competitors = [];

  this.addCompetitor = function(competitor) {
    this.competitors.push(competitor);
  };

  this.toJson = function() {
    var body = {};
    body.name = this.name;
    if (notEmpty(this.num_executor)) {
      body.num_executor_nodes = this.num_executor;
    }
    if (notEmpty(this.percentiles)) {
      body.percentiles = JSON.parse(this.percentiles);
    }
    if (this.competitors.length > 0) {
      body.competitors = this.competitors.map(function(c) {
        return c.toJson();
      });
    }
    if (notEmpty(this.iterations)) {
      body.iterations = this.iterations;
    }
    if (notEmpty(this.concurrency)) {
      body.concurrency = this.concurrency;
    }
    if (notEmpty(this.multiplier)) {
      body.multiplier = this.multiplier;
    }
    if (notEmpty(this.num_slowest)) {
      body.num_slowest = this.num_slowest;
    }
    return JSON.stringify(body, null, 4);
  };

}

function Competitor() {
  this.name = '';

  // override benchmark options
  this.iterations = '';
  this.concurrency = '';
  this.multiplier = '';
  this.num_slowest = '';
  this.warmup = true;
  this.requests = [];

  // defined only by competitor
  this.search_type = 'query_then_fetch';
  this.indices = '';
  this.types = '';

  // cache
  this.filter_cache = false;
  this.field_data = false;
  this.recycler_cache = false;
  this.id_cache = false;

  this.cache_fields = '';
  this.cache_keys = '';

  this.toJson = function() {
    var body = {};
    body.name = this.name;
    if (notEmpty(this.requests)) {
      body.requests = JSON.parse(this.requests);
    }
    if (notEmpty(this.iterations)) {
      if (isNumber(this.iterations)) {
        body.iterations = parseInt(this.iterations);
      } else {
        throw 'Iterations must be a valid number';
      }
    }
    if (notEmpty(this.concurrency)) {
      if (isNumber(this.concurrency)) {
        body.concurrency = parseInt(this.concurrency);
      } else {
        throw 'Concurrency must be a valid number';
      }
    }
    if (notEmpty(this.multiplier)) {
      if (isNumber(this.multiplier)) {
        body.multiplier = parseInt(this.multiplier);
      } else {
        throw 'Multiplier must be a valid number';
      }
    }
    if (notEmpty(this.num_slowest)) {
      if (isNumber(this.num_slowest)) {
        body.num_slowest = parseInt(this.num_slowest);
      } else {
        throw 'Num slowest must be a valid number';
      }
    }
    if (notEmpty(this.indices)) {
      body.indices = this.indices.split(',').map(function(index) {
        return index.trim();
      });
    }
    if (notEmpty(this.types)) {
      body.types = this.types.split(',').map(function(type) {
        return type.trim();
      });
    }

    body.search_type = this.search_type;

    body.clear_caches = {};
    body.clear_caches.filter = this.filter_cache;
    body.clear_caches.field_data = this.field_data;
    body.clear_caches.id = this.id_cache;
    body.clear_caches.recycler = this.recycler_cache;
    if (notEmpty(this.cache_fields)) {
      body.clear_caches.fields = this.cache_fields.split(',').map(
        function(field) {
          return field.trim();
        });
    }
    if (notEmpty(this.cache_keys)) {
      body.clear_caches.filter_keys = this.cache_keys.split(',').map(
        function(key) {
          return key.trim();
        });
    }

    return body;
  };

}

function Gist(title, url) {
  this.timestamp = getTimeString(new Date());
  this.title = title;
  this.url = url;

  this.loadFromJSON = function(json) {
    this.title = json.title;
    this.url = json.url;
    this.timestamp = json.timestamp;
    return this;
  };

}

function IndexFilter(name, state, hideSpecial, timestamp) {
  this.name = name;
  this.state = state;
  this.hide_special = hideSpecial;
  this.timestamp = timestamp;

  this.clone = function() {
    return new IndexFilter(this.name, this.state, this.hide_special,
      this.timestamp);
  };

  this.equals = function(other) {
    return (
      other !== null &&
      this.name == other.name &&
      this.state == other.state &&
      this.hide_special === other.hide_special &&
      this.timestamp == other.timestamp
      );
  };

  this.isBlank = function() {
    var emptyNameFilter = !notEmpty(this.name);
    var emptyStateFilter = !notEmpty(this.state);
    var disabledHideSpecial = !notEmpty(this.hide_special);
    return emptyNameFilter && emptyStateFilter && disabledHideSpecial;
  };

  this.matches = function(index) {
    if (this.isBlank()) {
      return true;
    } else {
      var matches = true;
      if (this.hide_special) {
        matches = !index.special;
      }
      if (matches && notEmpty(this.state)) {
        if (this.state == 'unhealthy' && !index.unhealthy) {
          matches = false;
        } else {
          var open = this.state == 'open';
          var closed = this.state == 'close';
          if ((open || closed) && this.state != index.state) {
            matches = false;
          }
        }
      }
      if (matches && notEmpty(this.name)) {
        try {
          var reg = new RegExp(this.name.trim(), 'i');
          matches = reg.test(index.name);
        }
        catch (err) { // if not valid regexp, still try normal matching
          matches = index.name.indexOf(this.name.toLowerCase()) != -1;
        }
      }
      return matches;
    }
  };

}

function ModalControls() {
  this.alert = null;
  this.active = false;
  this.title = '';
  this.info = '';
}

function NodeFilter(name, data, master, client, timestamp) {
  this.name = name;
  this.data = data;
  this.master = master;
  this.client = client;
  this.timestamp = timestamp;

  this.clone = function() {
    return new NodeFilter(this.name, this.data, this.master, this.client);
  };

  this.equals = function(other) {
    return (
      other !== null &&
      this.name == other.name &&
      this.data == other.data &&
      this.master == other.master &&
      this.client == other.client &&
      this.timestamp == other.timestamp
      );
  };

  this.isBlank = function() {
    return !notEmpty(this.name) && (this.data && this.master && this.client);
  };

  this.matches = function(node) {
    if (this.isBlank()) {
      return true;
    } else {
      return this.matchesName(node.name) && this.matchesType(node);
    }
  };

  this.matchesType = function(node) {
    return (
      node.data && this.data ||
      node.master && this.master ||
      node.client && this.client
      );
  };

  this.matchesName = function(name) {
    if (notEmpty(this.name)) {
      return name.toLowerCase().indexOf(this.name.toLowerCase()) != -1;
    } else {
      return true;
    }
  };

}

function Paginator(page, pageSize, collection, filter) {

  this.filter = filter;

  this.page = page;

  this.pageSize = pageSize;

  this.$collection = isDefined(collection) ? collection : [];

  this.nextPage = function() {
    this.page += 1;
  };

  this.previousPage = function() {
    this.page -= 1;
  };

  this.setPageSize = function(newSize) {
    this.pageSize = newSize;
  };

  this.getPageSize = function() {
    return this.pageSize;
  };

  this.getCurrentPage = function() {
    return this.page;
  };

  this.getPage = function() {
    var results = this.getResults();
    var total = results.length;

    var first = total > 0 ? ((this.page - 1) * this.pageSize) + 1 : 0;
    while (total < first) {
      this.previousPage();
      first = (this.page - 1) * this.pageSize + 1;
    }
    var lastPage = this.page * this.pageSize > total;
    var last = lastPage ? total : this.page * this.pageSize;

    var elements = total > 0 ? results.slice(first - 1, last) : [];

    var next = this.pageSize * this.page < total;
    var previous = this.page > 1;
    while (elements.length < this.pageSize) {
      elements.push(null);
    }
    return new Page(elements, total, first, last, next, previous);
  };

  this.setCollection = function(collection) {
    this.$collection = collection;
  };

  this.getResults = function() {
    var filter = this.filter;
    var collection = this.$collection;
    if (filter.isBlank()) {
      return collection;
    } else {
      var filtered = [];
      collection.forEach(function(item) {
        if (filter.matches(item)) {
          filtered.push(item);
        }
      });
      return filtered;
    }
  };

  this.getCollection = function() {
    return this.$collection;
  };

}

function Page(elements, total, first, last, next, previous) {
  this.elements = elements;
  this.total = total;
  this.first = first;
  this.last = last;
  this.next = next;
  this.previous = previous;
}

function Request(path, method, body) {
  this.timestamp = getTimeString(new Date());
  this.path = path;
  this.method = method;
  this.body = body;

  this.clear = function() {
    this.path = '';
    this.method = '';
    this.body = '';
  };

  this.loadFromJSON = function(json) {
    if (isDefined(json.url)) {
      var url = json.url.substring(7);
      var path = url.substring(url.indexOf('/'));
      this.path = path;
    } else {
      this.path = json.path;
    }
    this.method = json.method;
    this.body = json.body;
    this.timestamp = json.timestamp;
    return this;
  };

  this.equals = function(request) {
    return (
      this.path === request.path &&
      this.method.toUpperCase() === request.method.toUpperCase() &&
      this.body === request.body
      );
  };
}

function SnapshotFilter() {

  this.clone = function() {
    return new SnapshotFilter();
  };

  this.equals = function(other) {
    return other !== null;
  };

  this.isBlank = function() {
    return true;
  };

  this.matches = function(snapshot) {
    return true;
  };

}

function WarmerFilter(id) {

  this.id = id;

  this.clone = function() {
    return new WarmerFilter(this.id);
  };

  this.equals = function(other) {
    return other !== null && this.id == other.id;
  };

  this.isBlank = function() {
    return !notEmpty(this.id);
  };

  this.matches = function(warmer) {
    if (this.isBlank()) {
      return true;
    } else {
      return warmer.id.indexOf(this.id) != -1;
    }
  };

}

kopf.factory('AceEditorService', function() {

  this.init = function(name) {
    return new AceEditor(name);
  };

  return this;
});

var Alert = function(message, response, level, _class, icon) {
  var currentDate = new Date();
  this.message = message;
  this.response = response;
  this.level = level;
  this.class = _class;
  this.icon = icon;
  this.timestamp = getTimeString(currentDate);
  this.id = 'alert_box_' + currentDate.getTime();

  this.hasResponse = function() {
    return isDefined(this.response);
  };

  this.getResponse = function() {
    if (isDefined(this.response)) {
      return JSON.stringify(this.response, undefined, 2);
    }
  };
};

kopf.factory('AlertService', function() {
  this.maxAlerts = 3;

  this.alerts = [];

  // removes ALL alerts
  this.clear = function() {
    this.alerts.length = 0;
  };

  // remove a particular alert message
  this.remove = function(id) {
    $('#' + id).fadeTo(1000, 0).slideUp(200, function() {
      $(this).remove();
    });
    this.alerts = this.alerts.filter(function(a) {
      return id != a.id;
    });
  };

  // creates an error alert
  this.error = function(msg, resp, timeout) {
    timeout = isDefined(timeout) ? timeout : 7500;
    var alert = new Alert(msg, resp, 'error', 'alert-danger', 'fa fa-warning');
    return this.addAlert(alert, timeout);
  };

  // creates an info alert
  this.info = function(msg, resp, timeout) {
    timeout = isDefined(timeout) ? timeout : 2500;
    var alert = new Alert(msg, resp, 'info', 'alert-info', 'fa fa-info');
    return this.addAlert(alert, timeout);
  };

  // creates success alert
  this.success = function(msg, resp, timeout) {
    timeout = isDefined(timeout) ? timeout : 2500;
    var alert = new Alert(msg, resp, 'success', 'alert-success', 'fa fa-check');
    return this.addAlert(alert, timeout);
  };

  // creates a warn alert
  this.warn = function(msg, resp, timeout) {
    timeout = isDefined(timeout) ? timeout : 5000;
    var alert = new Alert(msg, resp, 'warn', 'alert-warning', 'fa fa-info');
    return this.addAlert(alert, timeout);
  };

  this.addAlert = function(alert, timeout) {
    this.alerts.unshift(alert);
    var service = this;
    setTimeout(function() {
      service.remove(alert.id);
    }, timeout);
    if (this.alerts.length >= this.maxAlerts) {
      this.alerts.length = 3;
    }
    return alert.id;
  };

  return this;
});

kopf.factory('DebugService', ['$location', function($location) {

  this.enabled = $location.search().debug === 'true';

  this.toggleEnabled = function() {
    this.enabled = !this.enabled;
  };

  this.isEnabled = function() {
    return this.enabled;
  };

  this.debug = function(message) {
    if (this.isEnabled()) {
      console.log(message);
    }
  };

  return this;

}]);

kopf.factory('ElasticService', ['$http', '$q', '$timeout',
  'ExternalSettingsService', 'DebugService', 'SettingsService', 'AlertService',
  function($http, $q, $timeout, ExternalSettingsService, DebugService,
           SettingsService, AlertService) {

    var checkVersion = new RegExp('(\\d)\\.(\\d)\\.(\\d)\\.*');

    var instance = this;

    this.connection = undefined;

    this.connected = false;

    this.cluster = undefined;

    this.clusterHealth = undefined;

    this.autoRefreshStarted = false;

    /**
     * Resets service state
     */
    this.reset = function() {
      this.connection = undefined;
      this.connected = false;
      this.cluster = undefined;
      this.clusterHealth = undefined;
    };

    this.getIndices = function() {
      return this.cluster ? this.cluster.indices : [];
    };

    this.getOpenIndices = function() {
      return this.cluster ? this.cluster.open_indices() : [];
    };

    this.isConnected = function() {
      return this.connected;
    };

    this.alertClusterChanges = function() {
      if (isDefined(this.cluster)) {
        var changes = this.cluster.changes;
        if (changes.hasChanges()) {
          if (changes.hasJoins()) {
            var joins = changes.nodeJoins.map(function(node) {
              return node.name + '[' + node.transport_address + ']';
            });
            AlertService.info(joins.length + ' new node(s) joined the cluster',
                joins);
          }
          if (changes.hasLeaves()) {
            var leaves = changes.nodeLeaves.map(function(node) {
              return node.name + '[' + node.transport_address + ']';
            });
            AlertService.warn(changes.nodeLeaves.length +
            ' node(s) left the cluster', leaves);
          }
          if (changes.hasCreatedIndices()) {
            var created = changes.indicesCreated.map(function(index) {
              return index.name;
            });
            AlertService.info(changes.indicesCreated.length +
            ' indices created: [' + created.join(',') + ']');
          }
          if (changes.hasDeletedIndices()) {
            var deleted = changes.indicesDeleted.map(function(index) {
              return index.name;
            });
            AlertService.info(changes.indicesDeleted.length +
            ' indices deleted: [' + deleted.join(',') + ']');
          }
        }
      }
    };

    /**
     * Connects to Elasticsearch instance and triggers auto polling of cluster
     * state
     *
     * @param {string} host - Elasticsearch url
     */
    this.connect = function(host) {
      this.reset();
      var root = ExternalSettingsService.getElasticsearchRootPath();
      var withCredentials = ExternalSettingsService.withCredentials();
      this.connection = new ESConnection(host + root, withCredentials);
      this.clusterRequest('GET', '/', {},
          function(data) {
            instance.setVersion(data.version.number);
            instance.connected = true;
            if (!instance.autoRefreshStarted) {
              instance.autoRefreshStarted = true;
              instance.autoRefreshCluster();
            } else {
              instance.refresh();
            }
          },
          function(data) {
            AlertService.error(
                'Error connecting to [' + instance.connection.host + ']',
                data
            );
          }
      );
    };

    this.setVersion = function(version) {
      this.version = {'str': version};
      if (!checkVersion.test(version)) {
        throw 'Invalid Elasticsearch version[' + version + ']';
      }
      var parts = checkVersion.exec(version);
      this.version.major = parseInt(parts[1]);
      this.version.minor = parseInt(parts[2]);
      this.version.build = parseInt(parts[3]);
    };

    this.getHost = function() {
      return this.isConnected() ? this.connection.host : '';
    };

    this.versionCheck = function(version) {
      if (isDefined(version)) {
        var parts = checkVersion.exec(version);
        var major = parseInt(parts[1]);
        var minor = parseInt(parts[2]);
        var build = parseInt(parts[3]);
        var v = this.version;
        var higherMajor = v.major > major;
        var higherMinor = v.major == major && v.minor > minor;
        var higherBuild = (
        v.major == major &&
        v.minor == minor &&
        v.build >= build
        );
        return (higherMajor || higherMinor || higherBuild);
      } else {
        return true;
      }

    };

    /**
     * Creates an index
     *
     * @param {string} name - new index name
     * @param {Object} settings - index settings
     * @callback success - invoked on success
     * @callback error - invoked on error
     */
    this.createIndex = function(name, settings, success, error) {
      var path = '/' + name;
      this.clusterRequest('POST', path, settings, success, error);
    };

    /**
     * Enables shard allocation
     *
     * @callback success - invoked on success
     * @callback error - invoked on error
     */
    this.enableShardAllocation = function(success, error) {
      var body = {
        transient: {
          'cluster.routing.allocation': {
            enable: 'all',
            disable_allocation: false // FIXME: deprecated
          }
        }
      };
      this.clusterRequest('PUT', '/_cluster/settings', body, success, error);
    };

    /**
     * Disables shard allocation
     *
     * @callback success - invoked on success
     * @callback error - invoked on error
     */
    this.disableShardAllocation = function(success, error) {
      var body = {
        transient: {
          'cluster.routing.allocation': {
            'enable': 'none',
            'disable_allocation': true  // FIXME: deprecated
          }
        }
      };
      this.clusterRequest('PUT', '/_cluster/settings', body, success, error);
    };

    /**
     * Shutdowns node
     *
     * @param {string} nodeId - id of node to be shutdown
     * @callback success - invoked on success
     * @callback error - invoked on error
     */
    this.shutdownNode = function(nodeId, success, error) {
      var path = '/_cluster/nodes/' + nodeId + '/_shutdown';
      this.clusterRequest('POST', path, {}, success, error);
    };

    /**
     * Opens index
     *
     * @param {string} index - index name
     * @callback success - invoked on success
     * @callback error - invoked on error
     */
    this.openIndex = function(index, success, error) {
      var path = '/' + index + '/_open';
      this.clusterRequest('POST', path, {}, success, error);
    };

    /**
     * Optimizes index
     *
     * @param {string} index - index name
     * @callback success - invoked on success
     * @callback error - invoked on error
     */
    this.optimizeIndex = function(index, success, error) {
      var path = '/' + index + '/_optimize';
      this.clusterRequest('POST', path, {}, success, error);
    };

    /**
     * Clears index cache
     *
     * @param {string} index - index name
     * @callback success - invoked on success
     * @callback error - invoked on error
     */
    this.clearCache = function(index, success, error) {
      var path = '/' + index + '/_cache/clear';
      this.clusterRequest('POST', path, {}, success, error);
    };

    /**
     * Closes index
     *
     * @param {string} index - index name
     * @callback success - invoked on success
     * @callback error - invoked on error
     */
    this.closeIndex = function(index, success, error) {
      var path = '/' + index + '/_close';
      this.clusterRequest('POST', path, {}, success, error);
    };

    /**
     * Refreshes index
     *
     * @param {string} index - index name
     * @callback success - invoked on success
     * @callback error - invoked on error
     */
    this.refreshIndex = function(index, success, error) {
      var path = '/' + index + '/_refresh';
      this.clusterRequest('POST', path, {}, success, error);
    };

    /**
     * Deletes index
     *
     * @param {string} index - index name
     * @callback success - invoked on success
     * @callback error - invoked on error
     */
    this.deleteIndex = function(index, success, error) {
      var path = '/' + index;
      this.clusterRequest('DELETE', path, {}, success, error);
    };

    /**
     * Updates index settings
     *
     * @param {string} name - index name
     * @param {Object} settings - index settings
     * @callback success - invoked on success
     * @callback error - invoked on error
     */
    this.updateIndexSettings = function(name, settings, success, error) {
      var path = '/' + name + '/_settings';
      this.clusterRequest('PUT', path, settings, success, error);
    };

    /**
     * Updates the cluster settings
     *
     * @param {Object} settings - new cluster settings
     * @callback success - invoked on success
     * @callback error - invoked on error
     */
    this.updateClusterSettings = function(settings, success, error) {
      var path = '/_cluster/settings';
      this.clusterRequest('PUT', path, settings, success, error);
    };

    /**
     * Deletes a warmer
     *
     * @param {Warmer} warmer - warmer to be deleted
     * @callback success - invoked on success
     * @callback error - invoked on error
     */
    this.deleteWarmer = function(warmer, success, error) {
      var path = '/' + warmer.index + '/_warmer/' + warmer.id;
      this.clusterRequest('DELETE', path, {}, success, error);
    };

    /**
     * Deletes a percolator
     *
     * @param {string} index - percolator target index
     * @param {string} id - percolator id
     * @callback success - invoked on success
     * @callback error - invoked on error
     */
    this.deletePercolatorQuery = function(index, id, success, error) {
      var path = '/' + index + '/.percolator/' + id;
      this.clusterRequest('DELETE', path, {}, success, error);
    };

    /**
     * Creates a percolator query
     *
     * @param {Percolator} percolator - percolator to be created
     * @callback success - invoked on success
     * @callback error - invoked on error
     */
    this.createPercolatorQuery = function(percolator, success, error) {
      var path = '/' + percolator.index + '/.percolator/' + percolator.id;
      this.clusterRequest('PUT', path, percolator.source, success, error);
    };

    /**
     * Creates a repository
     *
     * @param {string} repository - repository name
     * @param {Object} body - repository settings
     * @callback success - invoked on success
     * @callback error - invoked on error
     */
    this.createRepository = function(repository, body, success, error) {
      var path = '/_snapshot/' + repository;
      this.clusterRequest('POST', path, body, success, error);
    };

    /**
     * Deletes a repository
     *
     * @param {string} repository - repository name
     * @callback success - invoked on success
     * @callback error - invoked on error
     */
    this.deleteRepository = function(repository, success, error) {
      var path = '/_snapshot/' + repository;
      this.clusterRequest('DELETE', path, {}, success, error);
    };

    /**
     * Deletes a snapshot
     *
     * @param {string} repository - repository name
     * @param {string} snapshot - snapshot name
     * @callback success - invoked on success
     * @callback error - invoked on error
     */
    this.deleteSnapshot = function(repository, snapshot, success, error) {
      var path = '/_snapshot/' + repository + '/' + snapshot;
      this.clusterRequest('DELETE', path, {}, success, error);
    };

    /**
     * Restores a snapshot
     *
     * @param {string} repository - repository name
     * @param {string} name - snapshot name
     * @param {Object} body - restore settings
     * @callback success - invoked on success
     * @callback error - invoked on error
     */
    this.restoreSnapshot = function(repository, name, body, success, error) {
      var path = '/_snapshot/' + repository + '/' + name + '/_restore';
      this.clusterRequest('POST', path, body, success, error);
    };

    /**
     * Creates a snapshot
     *
     * @param {string} repository - repository name
     * @param {string} snapshot - snapshot name
     * @param {Object} body - snapshot settings
     * @callback success - invoked on success
     * @callback error - invoked on error
     */
    this.createSnapshot = function(repository, snapshot, body, success, error) {
      var path = '/_snapshot/' + repository + '/' + snapshot;
      this.clusterRequest('PUT', path, body, success, error);
    };

    /**
     * Executes a benchmark
     *
     * @param {Object} body - benchmark settings
     * @callback success - invoked on success
     * @callback error - invoked on error
     */
    this.executeBenchmark = function(body, success, error) {
      var path = '/_bench';
      this.clusterRequest('PUT', path, body, success, error);
    };

    /**
     * Registers a warmer query
     *
     * @param {Warmer} warmer - Warmer query
     * @callback success - invoked on success
     * @callback error - invoked on error
     */
    this.registerWarmer = function(warmer, success, error) {
      var path = '/' + warmer.index;
      if (notEmpty(warmer.types)) {
        path += '/' + warmer.types;
      }
      path += '/_warmer/' + warmer.id.trim();
      var body = warmer.source;
      this.clusterRequest('PUT', path, body, success, error);
    };

    /**
     * Updates indices aliases
     *
     * @param {Alias[]} add - aliases that should be added
     * @param {Alias[]} remove - aliases that should be removed
     * @callback success - invoked on success
     * @callback error - invoked on error
     */
    this.updateAliases = function(add, remove, success, error) {
      var data = {actions: []};
      add.forEach(function(a) { data.actions.push({add: a.info()}); });
      remove.forEach(function(a) { data.actions.push({remove: a.info()}); });
      this.clusterRequest('POST', '/_aliases', data, success, error);
    };

    this.getIndexMetadata = function(name, success, error) {
      var transformed = function(response) {
        success(new IndexMetadata(name, response.metadata.indices[name]));
      };
      var path = '/_cluster/state/metadata/' + name + '?human';
      this.clusterRequest('GET', path, {}, transformed, error);
    };

    this.getNodeStats = function(nodeId, success, error) {
      var transformed = function(response) {
        success(new NodeStats(name, response.nodes[nodeId]));
      };
      var path = '/_nodes/' + nodeId + '/stats?human';
      this.clusterRequest('GET', path, {}, transformed, error);
    };

    this.fetchAliases = function(success, error) {
      var createAliases = function(response) {
        var indices = Object.keys(response);
        var allAliases = [];
        indices.forEach(function(index) {
          var indexAliases = response[index].aliases;
          if (indexAliases && Object.keys(indexAliases).length > 0) {
            var aliases = Object.keys(indexAliases).map(function(alias) {
              var info = indexAliases[alias];
              return new Alias(alias, index, info.filter, info.index_routing,
                  info.search_routing);
            });
            allAliases.push(new IndexAliases(index, aliases));
          }
        });
        success(allAliases);
      };
      this.clusterRequest('GET', '/_aliases', {}, createAliases, error);
    };

    this.analyzeByField = function(index, type, field, text, success, error) {
      var buildTokens = function(response) {
        var tokens = response.tokens.map(function(t) {
          return new Token(t.token, t.start_offset, t.end_offset, t.position);
        });
        success(tokens);
      };
      var path = '/' + index + '/_analyze?field=' + type + '.' + field;
      this.clusterRequest('POST', path, text, buildTokens, error);
    };

    this.analyzeByAnalyzer = function(index, analyzer, text, success, error) {
      var buildTokens = function(response) {
        var tokens = response.tokens.map(function(t) {
          return new Token(t.token, t.start_offset, t.end_offset, t.position);
        });
        success(tokens);
      };
      var path = '/' + index + '/_analyze?analyzer=' + analyzer;
      this.clusterRequest('POST', path, text, buildTokens, error);
    };

    this.getIndexWarmers = function(index, warmer, success, error) {
      var path = '/' + index + '/_warmer/' + warmer.trim();
      var parseWarmers = function(response) {
        var warmers = [];
        Object.keys(response).forEach(function(i) {
          var index = i;
          var indexWarmers = response[index].warmers;
          Object.keys(indexWarmers).forEach(function(warmerId) {
            warmers.push(new Warmer(warmerId, index, indexWarmers[warmerId]));
          });
        });
        success(warmers);
      };
      this.clusterRequest('GET', path, {}, parseWarmers, error);
    };

    this.fetchPercolateQueries = function(index, query, success, error) {
      var path = '/' + index + '/.percolator/_search';
      var parsePercolators = function(response) {
        var collection = response.hits.hits.map(function(q) {
          return new PercolateQuery(q);
        });
        var from = query.from;
        var total = response.hits.total;
        var size = query.size;
        var percolators = new PercolatorsPage(from, size, total, collection);
        success(percolators);
      };
      var body = JSON.stringify(query);
      this.clusterRequest('POST', path, body, parsePercolators, error);
    };

    this.getRepositories = function(success, error) {
      var parseRepositories = function(response) {
        var repositories = Object.keys(response).map(function(repository) {
          return new Repository(repository, response[repository]);
        });
        success(repositories);
      };
      var path = '/_snapshot/_all';
      this.clusterRequest('GET', path, {}, parseRepositories, error);
    };

    this.getSnapshots = function(repository, success, error) {
      var path = '/_snapshot/' + repository + '/_all';
      var parseSnapshots = function(response) {
        var snapshots = response.snapshots.map(function(snapshot) {
          return new Snapshot(snapshot);
        });
        success(snapshots);
      };
      this.clusterRequest('GET', path, {}, parseSnapshots, error);
    };

    this.clusterRequest = function(method, path, data, success, error) {
      var url = this.connection.host;
      var params = {method: method, url: url + path, data: data};
      this.addAuth(params);
      DebugService.debug('Requesting [' + url + '] with params:');
      DebugService.debug(params);
      $http(params).
          success(function(data, status, headers, config) {
            try {
              success(data);
            } catch (exception) {
              error(exception);
            }
          }).
          error(function(data, status, headers, config) {
            error(data);
          });
    };

    /**
     * Loads cluster health
     */
    this.getClusterHealth = function() {
      var error = function(response) {
        instance.clusterHealth = null;
        AlertService.error('Error refreshing cluster health', response);
      };
      var success = function(response) {
        instance.clusterHealth = new ClusterHealth(response);
      };
      var path = '/_cluster/health';
      this.clusterRequest('GET', path, {}, success, error);
    };

    this.getClusterDetail = function(success, error) {
      var host = this.connection.host;
      var params = {};
      this.addAuth(params);
      DebugService.debug('Requesting cluster information with params:');
      DebugService.debug(params);
      $q.all([
        $http.get(host +
        '/_cluster/state/master_node,nodes,routing_table,blocks/', params),
        $http.get(host + '/_status', params),
        $http.get(host + '/_nodes/stats/jvm,fs,os', params),
        $http.get(host + '/_cluster/settings', params),
        $http.get(host + '/_aliases', params)
      ]).then(
          function(responses) {
            try {
              var state = responses[0].data;
              var status = responses[1].data;
              var stats = responses[2].data;
              var settings = responses[3].data;
              var aliases = responses[4].data;
              success(new Cluster(state, status, stats, settings, aliases));
            } catch (exception) {
              error(exception);
            }
          },
          function(response) {
            error(response);
          }
      );
    };

    this.getClusterDiagnosis = function(health, state, stats, hotthreads,
                                        success, error) {
      var host = this.connection.host;
      var params = {};
      this.addAuth(params);
      var requests = [];
      if (health) {
        requests.push($http.get(host + '/_cluster/health', params));
      }
      if (state) {
        requests.push($http.get(host + '/_cluster/state', params));
      }
      if (stats) {
        requests.push($http.get(host + '/_nodes/stats?all=true', params));
      }
      if (hotthreads) {
        requests.push($http.get(host + '/_nodes/hot_threads', params));
      }
      $q.all(requests).then(
          function(responses) {
            try {
              success(responses.map(function(response) {
                return response.data;
              }));
            } catch (exception) {
              error(exception);
            }
          },
          function(response) {
            error(response);
          }
      );
    };

    this.refresh = function() {
      if (this.isConnected()) {
        var threshold = (SettingsService.getRefreshInterval() * 0.75);
        $timeout(function() {
          var start = new Date().getTime();
          instance.getClusterDetail(
              function(cluster) {
                var end = new Date().getTime();
                var took = end - start;
                if (took >= threshold) {
                  AlertService.warn('Loading cluster information is taking ' +
                  'too long. Try increasing the refresh interval');
                }
                cluster.computeChanges(instance.cluster);
                instance.cluster = cluster;
                instance.alertClusterChanges();
              },
              function(response) {
                AlertService.error('Error refreshing cluster state', response);
                instance.cluster = null;
              }
          );
          instance.getClusterHealth();
        }, 100);
      } else {
        this.cluster = undefined;
        this.clusterHealth = undefined;
      }
    };

    this.autoRefreshCluster = function() {
      this.refresh();
      var nextRefresh = function() {
        instance.autoRefreshCluster();
      };
      $timeout(nextRefresh, SettingsService.getRefreshInterval());
    };

    /**
     * Adds authentication information/cookies to request params
     * @param {Object} params - request parameters
     */
    this.addAuth = function(params) {
      if (isDefined(this.connection.auth)) {
        params.headers = {Authorization: this.connection.auth};
      }
      if (this.connection.withCredentials) {
        params.withCredentials = true;
      }
    };

    return this;

  }]);

kopf.factory('ExternalSettingsService', function($http, $q) {

  var ES_ROOT_PATH = 'elasticsearch_root_path';

  var WITH_CREDENTIALS = 'with_credentials';

  this.settings = null;

  this.getSettings = function() {
    if (!isDefined(this.settings)) {
      this.settings = {};
      var settings = this.settings;
      var params = {
        type: 'GET',
        url: './kopf_external_settings.json',
        dataType: 'json',
        async: false
      };
      var settingsFuture = $.ajax(params);
      settingsFuture.done(function(data) {
        try {
          Object.keys(data).forEach(function(setting) {
            settings[setting] = data[setting];
          });
        } catch (error) {
          throw {
            message: 'Error processing external settings',
            body: data
          };
        }
      });
      settingsFuture.fail(function(error) {
        throw {
          message: 'Error fetching external settings from file',
          body: error
        };
      });
    }
    return this.settings;
  };

  this.getElasticsearchRootPath = function() {
    return this.getSettings()[ES_ROOT_PATH];
  };

  this.withCredentials = function() {
    return this.getSettings()[WITH_CREDENTIALS];
  };

  return this;

});

kopf.factory('HostHistoryService', function() {

  this.getHostHistory = function() {
    var history = localStorage.getItem('kopfHostHistory');
    history = isDefined(history) ? history : '[]';
    return JSON.parse(history);
  };

  this.addToHistory = function(host) {
    host = host.toLowerCase();
    var hostEntry = {host: host};
    var history = this.getHostHistory();
    for (var i = 0; i < history.length; i++) {
      if (history[i].host === host) {
        history.splice(i, 1);
        break;
      }
    }
    history.splice(0, 0, hostEntry);
    if (history.length > 10) {
      history.length = 10;
    }
    localStorage.setItem('kopfHostHistory', JSON.stringify(history));
  };

  this.clearHistory = function() {
    localStorage.removeItem('kopfHostHistory');
  };

  return this;

});

kopf.factory('NodesFilter', function() {

  this.filter = new NodeFilter('', true, true, true, 0);

  return this;

});

kopf.factory('OverviewFilter', function() {

  this.node = new NodeFilter('', true, true, true, 0);

  this.index = new IndexFilter('', '', true, 0);

  this.page = 1;

  return this;

});

kopf.factory('SettingsService', function() {

  this.refreshInterval = 3000;

  this.setRefreshInterval = function(interval) {
    this.refreshInterval = interval;
    localStorage.kopfRefreshInterval = interval;
  };

  this.getRefreshInterval = function() {
    if (isDefined(localStorage.kopfRefreshInterval)) {
      return localStorage.kopfRefreshInterval;
    } else {
      return this.refreshInterval;
    }
  };

  return this;

});

kopf.factory('ThemeService', function() {

  this.theme = 'dark';

  this.setTheme = function(theme) {
    this.theme = theme;
    localStorage.kopfTheme = theme;
  };

  this.getTheme = function() {
    if (isDefined(localStorage.kopfTheme)) {
      return localStorage.kopfTheme;
    } else {
      return this.theme;
    }
  };

  return this;
});

function readablizeBytes(bytes) {
  if (bytes > 0) {
    var s = ['b', 'KB', 'MB', 'GB', 'TB', 'PB'];
    var e = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, e)).toFixed(2) + s[e];
  } else {
    return 0;
  }
}

// Gets the value of a nested property from an object if it exists.
// Otherwise returns the default_value given.
// Example: get the value of object[a][b][c][d]
// where property_path is [a,b,c,d]
function getProperty(object, propertyPath, defaultValue) {
  if (isDefined(object)) {
    if (isDefined(object[propertyPath])) {
      return object[propertyPath];
    }
    var pathParts = propertyPath.split('.'); // path as nested properties
    for (var i = 0; i < pathParts.length && isDefined(object); i++) {
      object = object[pathParts[i]];
    }
  }
  return isDefined(object) ? object : defaultValue;
}

// Checks if value is both non null and undefined
function isDefined(value) {
  return value !== null && typeof value != 'undefined';
}

// Checks if the String representation of value is a non empty string
// string.trim().length is grater than 0
function notEmpty(value) {
  return isDefined(value) && value.toString().trim().length > 0;
}

function isNumber(value) {
  var exp = /\d+/;
  return exp.test(value);
}

// Returns the given date as a String formatted as hh:MM:ss
function getTimeString(date) {
  var hh = ('0' + date.getHours()).slice(-2);
  var mm = ('0' + date.getMinutes()).slice(-2);
  var ss = ('0' + date.getSeconds()).slice(-2);
  return hh + ':' + mm + ':' + ss;
}

function prettyPrintObject(object) {
  var prettyObject = {};
  Object.keys(object).forEach(function(key) {
    var parts = key.split('.');
    var property = null;
    var reference = prettyObject;
    var previous = null;
    for (var i = 0; i < parts.length; i++) {
      if (i == parts.length - 1) {
        if (isNaN(parts[i])) {
          reference[parts[i]] = object[key];
        } else {
          if (!(previous[property] instanceof Array)) {
            previous[property] = [];
          }
          previous[property].push(object[key]);
        }
      } else {
        property = parts[i];
        if (!isDefined(reference[property])) {
          reference[property] = {};
        }
        previous = reference;
        reference = reference[property];
      }
    }
  });
  return JSON.stringify(prettyObject, undefined, 4);
}
