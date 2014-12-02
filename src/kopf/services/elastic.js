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
