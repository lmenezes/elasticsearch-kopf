function ElasticClient(connection, httpService, q) {
  this.host = connection.host;
  this.username = connection.username;
  this.password = connection.password;
  this.withCredentials = connection.with_credentials;

  this.createAuthToken = function(username, password) {
    var hasAuth = isDefined(username) && isDefined(password);
    return hasAuth ? 'Basic ' + window.btoa(username + ':' + password) : null;
  };

  var auth = this.createAuthToken(this.username, this.password);
  var fetchVersion = $.ajax({
    type: 'GET',
    url: connection.host + '/',
    dataType: 'json',
    beforeSend: function(xhr) {
      if (isDefined(auth)) {
        xhr.setRequestHeader('Authorization', auth);
      }
      if (this.withCredentials) {
        xhr.setRequestHeader('withCredentials', true);
      }
    },
    async: false
  });

  var client = this;
  fetchVersion.done(function(response) {
    try {
      var version = response.version.number;
      client.version = {'str': version};
      var parts = version.split('.');
      client.version.major = parseInt(parts[0]);
      client.version.minor = parseInt(parts[1]);
      client.version.build = parseInt(parts[2]);
    } catch (error) {
      throw {
        message: 'Version property could not bet read. Are you sure there ' +
          'is an ElasticSearch runnning at [' + connection.host + ']?',
        body: response
      };
    }
  });

  fetchVersion.fail(function(error) {
    throw error.statusText;
  });

  this.versionCheck = function(version) {
    var parts = version.split('.');
    var major = parseInt(parts[0]);
    var minor = parseInt(parts[1]);
    var build = parseInt(parts[2]);
    var v = this.version;
    var higherMajor = v.major > major;
    var higherMinor = v.major == major && v.minor > minor;
    var higherBuild = v.major == major && v.minor == minor && v.build >= build;
    return (higherMajor || higherMinor || higherBuild);
  };

  this.createIndex = function(name, settings, callbackSuccess, callbackError) {
    var path = '/' + name;
    this.clusterRequest('POST', path, settings, callbackSuccess, callbackError);
  };

  this.enableShardAllocation = function(callbackSuccess, callbackError) {
    var newSettings = {
      'transient': {
        'cluster.routing.allocation': {
          'enable': 'all', 'disable_allocation': false
        }
      }
    };
    var body = JSON.stringify(newSettings, undefined, '');
    var path = '/_cluster/settings';
    this.clusterRequest('PUT', path, body, callbackSuccess, callbackError);
  };

  this.disableShardAllocation = function(callbackSuccess, callbackError) {
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
    this.clusterRequest('PUT', path, body, callbackSuccess, callbackError);
  };

  this.shutdownNode = function(nodeId, callbackSuccess, callbackError) {
    var path = '/_cluster/nodes/' + nodeId + '/_shutdown';
    this.clusterRequest('POST', path, {}, callbackSuccess, callbackError);
  };

  this.openIndex = function(index, callbackSuccess, callbackError) {
    var path = '/' + index + '/_open';
    this.clusterRequest('POST', path, {}, callbackSuccess, callbackError);
  };

  this.optimizeIndex = function(index, callbackSuccess, callbackError) {
    var path = '/' + index + '/_optimize';
    this.clusterRequest('POST', path, {}, callbackSuccess, callbackError);
  };

  this.clearCache = function(index, callbackSuccess, callbackError) {
    var path = '/' + index + '/_cache/clear';
    this.clusterRequest('POST', path, {}, callbackSuccess, callbackError);
  };

  this.closeIndex = function(index, callbackSuccess, callbackError) {
    var path = '/' + index + '/_close';
    this.clusterRequest('POST', path, {}, callbackSuccess, callbackError);
  };

  this.refreshIndex = function(index, callbackSuccess, callbackError) {
    var path = '/' + index + '/_refresh';
    this.clusterRequest('POST', path, {}, callbackSuccess, callbackError);
  };

  this.deleteIndex = function(name, callbackSuccess, callbackError) {
    var path = '/' + name;
    this.clusterRequest('DELETE', path, {}, callbackSuccess, callbackError);
  };

  this.updateIndexSettings = function(name, settings, callbackSuccess,
                                      callbackError) {
    var path = '/' + name + '/_settings';
    this.clusterRequest('PUT', path, settings, callbackSuccess, callbackError);
  };

  this.updateClusterSettings = function(settings, callbackSuccess,
                                        callbackError) {
    var path = '/_cluster/settings';
    this.clusterRequest('PUT', path, settings, callbackSuccess, callbackError);
  };

  this.getIndexMetadata = function(name, callbackSuccess, callbackError) {
    var transformed = function(response) {
      callbackSuccess(new IndexMetadata(name, response.metadata.indices[name]));
    };
    var path = '/_cluster/state/metadata/' + name;
    this.clusterRequest('GET', path, {}, transformed, callbackError);
  };

  this.fetchAliases = function(callbackSuccess, callbackError) {
    var createAliases = function(response) {
      var indices = Object.keys(response);
      var allAliases = [];
      indices.forEach(function(index) {
        var indexAliases = response[index].aliases;
        if (Object.keys(indexAliases).length > 0) {
          var aliases = Object.keys(indexAliases).map(function(alias) {
            var info = indexAliases[alias];
            return new Alias(alias, index, info.filter, info.index_routing,
              info.search_routing);
          });
          allAliases.push(new IndexAliases(index, aliases));
        }
      });
      callbackSuccess(allAliases);
    };
    this.clusterRequest('GET', '/_aliases', {}, createAliases, callbackError);
  };

  this.analyzeByField = function(index, type, field, text, callbackSuccess,
                                 callbackError) {
    var buildTokens = function(response) {
      var tokens = response.tokens.map(function(token) {
        return new Token(token.token, token.start_offset, token.end_offset,
          token.position);
      });
      callbackSuccess(tokens);
    };
    var path = '/' + index + '/_analyze?field=' + type + '.' + field;
    this.clusterRequest('POST', path, text, buildTokens, callbackError);
  };

  this.analyzeByAnalyzer = function(index, analyzer, text, callbackSuccess,
                                    callbackError) {
    var buildTokens = function(response) {
      var tokens = response.tokens.map(function(token) {
        return new Token(token.token, token.start_offset, token.end_offset,
          token.position);
      });
      callbackSuccess(tokens);
    };
    var path = '/' + index + '/_analyze?analyzer=' + analyzer;
    this.clusterRequest('POST', path, text, buildTokens, callbackError);
  };

  this.updateAliases = function(addAliases, removeAliases, callbackSuccess,
                                callbackError) {
    var data = {actions: []};
    removeAliases.forEach(function(alias) {
      data.actions.push({'remove': alias.info()});
    });
    addAliases.forEach(function(alias) {
      data.actions.push({'add': alias.info()});
    });
    var body = JSON.stringify(data);
    var path = '/_aliases';
    this.clusterRequest('POST', path, body, callbackSuccess, callbackError);
  };

  this.getIndexWarmers = function(index, warmer, callbackSuccess,
                                  callbackError) {
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
      callbackSuccess(warmers);
    };
    this.clusterRequest('GET', path, {}, parseWarmers, callbackError);
  };

  this.deleteWarmupQuery = function(warmer, callbackSuccess, callbackError) {
    var path = '/' + warmer.index + '/_warmer/' + warmer.id;
    this.clusterRequest('DELETE', path, {}, callbackSuccess, callbackError);
  };

  this.registerWarmupQuery = function(warmer, callbackSuccess, callbackError) {
    var path = '/' + warmer.index + '/';
    if (notEmpty(warmer.types)) {
      path += warmer.types + '/';
    }
    path += '/_warmer/' + warmer.id.trim();
    var body = warmer.source;
    this.clusterRequest('PUT', path, body, callbackSuccess, callbackError);
  };

  this.fetchPercolateQueries = function(index, query, callbackSuccess,
                                        callbackError) {
    var path = '/' + index + '/.percolator/_search';
    var parsePercolators = function(response) {
      var collection = response.hits.hits.map(function(q) {
        return new PercolateQuery(q);
      });
      var from = query.from;
      var total = response.hits.total;
      var size = query.size;
      var percolators = new PercolatorsPage(from, size, total, collection);
      callbackSuccess(percolators);
    };
    var body = JSON.stringify(query);
    this.clusterRequest('POST', path, body, parsePercolators, callbackError);
  };

  this.deletePercolatorQuery = function(index, id, callbackSuccess,
                                        callbackError) {
    var path = '/' + index + '/.percolator/' + id;
    this.clusterRequest('DELETE', path, {}, callbackSuccess, callbackError);
  };

  this.createPercolatorQuery = function(percolator, callbackSuccess,
                                        callbackError) {
    var path = '/' + percolator.index + '/.percolator/' + percolator.id;
    var body = percolator.source;
    this.clusterRequest('PUT', path, body, callbackSuccess, callbackError);
  };

  this.getRepositories = function(callbackSuccess, callbackError) {
    var parseRepositories = function(response) {
      var repositories = Object.keys(response).map(function(repository) {
        return new Repository(repository, response[repository]);
      });
      callbackSuccess(repositories);
    };
    var path = '/_snapshot/_all';
    this.clusterRequest('GET', path, {}, parseRepositories, callbackError);
  };

  this.createRepository = function(repository, body, callbackSuccess,
                                   callbackError) {
    var path = '/_snapshot/' + repository;
    this.clusterRequest('POST', path, body, callbackSuccess, callbackError);
  };

  this.deleteRepository = function(repository, callbackSuccess, callbackError) {
    var path = '/_snapshot/' + repository;
    this.clusterRequest('DELETE', path, {}, callbackSuccess, callbackError);
  };

  this.getSnapshots = function(repository, callbackSuccess, callbackError) {
    var path = '/_snapshot/' + repository + '/_all';
    var parseSnapshots = function(response) {
      var snapshots = response.snapshots.map(function(snapshot) {
        return new Snapshot(snapshot);
      });
      callbackSuccess(snapshots);
    };
    this.clusterRequest('GET', path, {}, parseSnapshots, callbackError);
  };

  this.deleteSnapshot = function(repository, snapshot, callbackSuccess,
                                 callbackError) {
    var path = '/_snapshot/' + repository + '/' + snapshot;
    this.clusterRequest('DELETE', path, {}, callbackSuccess, callbackError);
  };

  this.restoreSnapshot = function(repository, snapshot, body, callbackSuccess,
                                  callbackError) {
    var path = '/_snapshot/' + repository + '/' + snapshot + '/_restore';
    this.clusterRequest('POST', path, body, callbackSuccess, callbackError);
  };

  this.createSnapshot = function(repository, snapshot, body, callbackSuccess,
                                 callbackError) {
    var path = '/_snapshot/' + repository + '/' + snapshot;
    this.clusterRequest('PUT', path, body, callbackSuccess, callbackError);
  };

  this.executeBenchmark = function(body, callbackSuccess, callbackError) {
    this.clusterRequest('PUT', '/_bench', body, callbackSuccess, callbackError);
  };

  this.clusterRequest = function(method, path, data, callbackSuccess,
                                 callbackError) {
    var params = {method: method, url: this.host + path, data: data};
    if (auth !== null) {
      params.withCredentials = true;
      params.headers = {Authorization: auth};
    }
    if (this.withCredentials) {
      params.withCredentials = true;
    }
    httpService(params).
      success(function(data, status, headers, config) {
        try {
          callbackSuccess(data);
        } catch (error) {
          callbackError(error);
        }
      }).
      error(function(data, status, headers, config) {
        callbackError(data);
      });
  };

  this.executeRequest = function(method, url, username, password, data,
                                 callbackSuccess, callbackError) {
    var params = {method: method, url: url, data: data};
    if (auth !== null) {
      params.withCredentials = true;
      params.headers = {Authorization: auth};
    }
    if (this.withCredentials) {
      params.withCredentials = true;
    }
    httpService(params).
      success(function(data, status, headers, config) {
        callbackSuccess(data);
      }).
      error(function(data, status, headers, config) {
        callbackError(data, status);
      });
  };

  /** ####### END OF REFACTORED AREA ####### **/

  this.getClusterHealth = function(callbackSuccess, callbackError) {
    var createClusterHealth = function(clusterHealth) {
      try {
        callbackSuccess(new ClusterHealth(clusterHealth));
      } catch (error) {
        callbackError(error);
      }
    };
    var path = '/_cluster/health';
    this.clusterRequest('GET', path, {}, createClusterHealth, callbackError);
  };

  this.getClusterDetail = function(callbackSuccess, callbackError) {
    var host = this.host;
    var params = {};
    if (isDefined(auth)) {
      params.withCredentials = true;
      params.headers = {Authorization: auth};
    }
    if (this.withCredentials) {
      params.withCredentials = true;
    }

    q.all([
      httpService.get(host +
        '/_cluster/state/master_node,nodes,routing_table,blocks/', params),
      httpService.get(host + '/_status', params),
      httpService.get(host + '/_nodes/stats?all=true', params),
      httpService.get(host + '/_cluster/settings', params),
      httpService.get(host + '/_aliases', params)
    ]).then(
      function(responses) {
        try {
          var state = responses[0].data;
          var status = responses[1].data;
          var stats = responses[2].data;
          var settings = responses[3].data;
          var aliases = responses[4].data;
          callbackSuccess(new Cluster(state, status, stats, settings, aliases));
        } catch (error) {
          callbackError(error);
        }
      },
      function(error) {
        callbackError(error);
      }
    );
  };

  this.getClusterDiagnosis = function(health, state, stats, hotthreads,
                                      callbackSuccess, callbackError) {
    var host = this.host;
    var auth = this.createAuthToken(this.username, this.password);
    var params = {};
    if (isDefined(auth)) {
      params.withCredentials = true;
      params.headers = {Authorization: auth};
    }
    if (this.withCredentials) {
      params.withCredentials = true;
    }
    var requests = [];
    if (health) {
      requests.push(httpService.get(host + '/_cluster/health', params));
    }
    if (state) {
      requests.push(httpService.get(host + '/_cluster/state', params));
    }
    if (stats) {
      requests.push(httpService.get(host + '/_nodes/stats?all=true', params));
    }
    if (hotthreads) {
      requests.push(httpService.get(host + '/_nodes/hot_threads', params));
    }
    q.all(requests).then(
      function(responses) {
        try {
          callbackSuccess(responses.map(function(response) {
            return response.data;
          }));
        } catch (error) {
          callbackError(error);
        }
      },
      function(error) {
        callbackError(error);
      }
    );
  };
}
