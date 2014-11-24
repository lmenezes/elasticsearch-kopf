kopf.factory('ElasticService', ['$http', '$q', '$timeout',
  'ExternalSettingsService', 'DebugService', 'SettingsService', 'AlertService',
  function($http, $q, $timeout, ExternalSettingsService, DebugService,
           SettingsService, AlertService) {

    var checkVersion = new RegExp('(\\d)\\.(\\d)\\.(\\d)\\.*');

    var instance = this;

    this.connection = null;

    this.connected = false;

    this.cluster = null;

    this.clusterHealth = null;

    this.autoRefreshStarted = false;

    this.getIndices = function() {
      return isDefined(this.cluster) ? this.cluster.indices : [];
    };

    this.getOpenIndices = function() {
      return isDefined(this.cluster) ? this.cluster.open_indices() : [];
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

    this.connect = function(host) {
      var root = ExternalSettingsService.getElasticsearchRootPath();
      var withCredentials = ExternalSettingsService.withCredentials();
      this.connection = new ESConnection(host + root, withCredentials);
      this.clusterRequest('GET', '/', {},
          function(data) {
            try {
              instance.setVersion(data.version.number);
            } catch (exception) {
              instance.connected = false;
              throw {
                message: 'Error reading cluster version',
                body: data
              };
            }
          },
          function(data) {
            instance.connected = false;
            throw {
              message: 'Error connecting to [' + instance.connection.host + ']',
              body: data
            };
          }
      );
    };

    this.setVersion = function(version) {
      this.version = {'str': version};
      if (checkVersion.test(version)) {

      } else {
        throw 'Invalid Elasticsearch version[' + version + ']';
      }
      var parts = checkVersion.exec(version);
      this.version.major = parseInt(parts[1]);
      this.version.minor = parseInt(parts[2]);
      this.version.build = parseInt(parts[3]);
      this.connected = true;
      if (!this.autoRefreshStarted) {
        this.autoRefreshCluster();
        this.autoRefreshStarted = true;
      }
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

    this.createIndex = function(name, settings, success, error) {
      var path = '/' + name;
      this.clusterRequest('POST', path, settings, success, error);
    };

    this.enableShardAllocation = function(success, error) {
      var newSettings = {
        'transient': {
          'cluster.routing.allocation': {
            'enable': 'all', 'disable_allocation': false
          }
        }
      };
      var body = JSON.stringify(newSettings, undefined, '');
      var path = '/_cluster/settings';
      this.clusterRequest('PUT', path, body, success, error);
    };

    this.disableShardAllocation = function(success, error) {
      var newSettings = {
        'transient': {
          'cluster.routing.allocation': {
            'enable': 'none',
            'disable_allocation': true
          }
        }
      };
      var body = JSON.stringify(newSettings, undefined, '');
      var path = '/_cluster/settings';
      this.clusterRequest('PUT', path, body, success, error);
    };

    this.shutdownNode = function(nodeId, success, error) {
      var path = '/_cluster/nodes/' + nodeId + '/_shutdown';
      this.clusterRequest('POST', path, {}, success, error);
    };

    this.openIndex = function(index, success, error) {
      var path = '/' + index + '/_open';
      this.clusterRequest('POST', path, {}, success, error);
    };

    this.optimizeIndex = function(index, success, error) {
      var path = '/' + index + '/_optimize';
      this.clusterRequest('POST', path, {}, success, error);
    };

    this.clearCache = function(index, success, error) {
      var path = '/' + index + '/_cache/clear';
      this.clusterRequest('POST', path, {}, success, error);
    };

    this.closeIndex = function(index, success, error) {
      var path = '/' + index + '/_close';
      this.clusterRequest('POST', path, {}, success, error);
    };

    this.refreshIndex = function(index, success, error) {
      var path = '/' + index + '/_refresh';
      this.clusterRequest('POST', path, {}, success, error);
    };

    this.deleteIndex = function(name, success, error) {
      var path = '/' + name;
      this.clusterRequest('DELETE', path, {}, success, error);
    };

    this.updateIndexSettings = function(name, settings, success, error) {
      var path = '/' + name + '/_settings';
      this.clusterRequest('PUT', path, settings, success, error);
    };

    this.updateClusterSettings = function(settings, success, error) {
      var path = '/_cluster/settings';
      this.clusterRequest('PUT', path, settings, success, error);
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

    this.updateAliases = function(addAliases, removeAliases, success, error) {
      var data = {actions: []};
      removeAliases.forEach(function(alias) {
        data.actions.push({'remove': alias.info()});
      });
      addAliases.forEach(function(alias) {
        data.actions.push({'add': alias.info()});
      });
      var path = '/_aliases';
      this.clusterRequest('POST', path, JSON.stringify(data), success, error);
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

    this.deleteWarmer = function(warmer, success, error) {
      var path = '/' + warmer.index + '/_warmer/' + warmer.id;
      this.clusterRequest('DELETE', path, {}, success, error);
    };

    this.registerWarmer = function(warmer, success, error) {
      var path = '/' + warmer.index + '/';
      if (notEmpty(warmer.types)) {
        path += warmer.types + '/';
      }
      path += '/_warmer/' + warmer.id.trim();
      var body = warmer.source;
      this.clusterRequest('PUT', path, body, success, error);
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

    this.deletePercolatorQuery = function(index, id, success, error) {
      var path = '/' + index + '/.percolator/' + id;
      this.clusterRequest('DELETE', path, {}, success, error);
    };

    this.createPercolatorQuery = function(percolator, success, error) {
      var path = '/' + percolator.index + '/.percolator/' + percolator.id;
      this.clusterRequest('PUT', path, percolator.source, success, error);
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

    this.createRepository = function(repository, body, success, error) {
      var path = '/_snapshot/' + repository;
      this.clusterRequest('POST', path, body, success, error);
    };

    this.deleteRepository = function(repository, success, error) {
      var path = '/_snapshot/' + repository;
      this.clusterRequest('DELETE', path, {}, success, error);
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

    this.deleteSnapshot = function(repository, snapshot, success, error) {
      var path = '/_snapshot/' + repository + '/' + snapshot;
      this.clusterRequest('DELETE', path, {}, success, error);
    };

    this.restoreSnapshot = function(repository, name, body, success, error) {
      var path = '/_snapshot/' + repository + '/' + name + '/_restore';
      this.clusterRequest('POST', path, body, success, error);
    };

    this.createSnapshot = function(repository, snapshot, body, success, error) {
      var path = '/_snapshot/' + repository + '/' + snapshot;
      this.clusterRequest('PUT', path, body, success, error);
    };

    this.executeBenchmark = function(body, success, error) {
      var path = '/_bench';
      this.clusterRequest('PUT', path, body, success, error);
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

    this.getClusterHealth = function(success, error) {
      var createClusterHealth = function(clusterHealth) {
        try {
          success(new ClusterHealth(clusterHealth));
        } catch (exception) {
          error(exception);
        }
      };
      var path = '/_cluster/health';
      this.clusterRequest('GET', path, {}, createClusterHealth, error);
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
              success(new Cluster(state, status, stats, settings,
                  aliases));
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
          instance.getClusterHealth(
              function(clusterHealth) {
                instance.clusterHealth = clusterHealth;
              },
              function(response) {
                instance.clusterHealth = null;
                AlertService.error('Error refreshing cluster health', response);
              }
          );
        }, 100);
      } else {
        this.cluster = null;
        this.clusterHealth = null;
      }
    };

    this.autoRefreshCluster = function() {
      this.refresh();
      var nextRefresh = function() {
        instance.autoRefreshCluster();
      };
      $timeout(nextRefresh, SettingsService.getRefreshInterval());
    };

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
