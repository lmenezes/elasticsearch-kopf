"use strict";

describe("ElasticService", function() {
  var elasticService, $http, $httpBackend, $timeout;

  beforeEach(module("kopf"));

  beforeEach(function() {
    module('kopf');
    module(function($provide) {
      $provide.value('ExternalSettingsService', {
        getElasticsearchRootPath: function() {
        },
        withCredentials: function() {
        }
      });
    });
  });

  beforeEach(inject(function($injector) {
    elasticService = $injector.get('ElasticService');
    this.AlertService = $injector.get('AlertService');
    this.ExternalSettingsService = $injector.get('ExternalSettingsService');
    $http = $injector.get('$http');
    $timeout = $injector.get('$timeout');
    $httpBackend = $injector.get('$httpBackend');
  }));

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  it("should fetch cluster version and set connection info if request is successfull",
      function() {
        spyOn(elasticService, 'reset').andCallThrough();
        expect(elasticService.connected).toEqual(false);
        expect(elasticService.autoRefreshStarted).toEqual(false);
        expect(elasticService.connection).toEqual(undefined);
        spyOn(this.ExternalSettingsService,
            'getElasticsearchRootPath').andReturn('/testing');
        spyOn(this.ExternalSettingsService, 'withCredentials').andReturn(true);
        elasticService.clusterRequest = function(m, p, d, success, f) {
          success({version: {number: '1.9.13'}});
        };
        spyOn(elasticService, 'clusterRequest').andCallThrough();
        spyOn(elasticService, 'setVersion').andCallThrough();
        spyOn(elasticService, 'autoRefreshCluster').andCallThrough();
        elasticService.connect('http://localhost:9200');
        expect(this.ExternalSettingsService.getElasticsearchRootPath).toHaveBeenCalled();
        expect(this.ExternalSettingsService.withCredentials).toHaveBeenCalled();
        expect(elasticService.clusterRequest).toHaveBeenCalledWith('GET', '/',
            {}, jasmine.any(Function), jasmine.any(Function));
        expect(elasticService.connection.host).toEqual('http://localhost:9200/testing');
        expect(elasticService.connection.withCredentials).toEqual(true);
        expect(elasticService.setVersion).toHaveBeenCalledWith('1.9.13');
        expect(elasticService.connected).toEqual(true);
        expect(elasticService.autoRefreshStarted).toEqual(true);
        expect(elasticService.autoRefreshCluster).toHaveBeenCalled();
        expect(elasticService.reset).toHaveBeenCalled();
      });

  it("should handle an error while requesting version", function() {
    expect(elasticService.connection).toEqual(null);
    spyOn(this.ExternalSettingsService,
        'getElasticsearchRootPath').andReturn('/testing');
    spyOn(this.ExternalSettingsService, 'withCredentials').andReturn(true);
    elasticService.clusterRequest = function(m, p, d, s, fail) {
      fail("whaaatt");
    };
    spyOn(elasticService, 'clusterRequest').andCallThrough();
    spyOn(elasticService, 'setVersion').andCallThrough();
    spyOn(this.AlertService, 'error').andReturn(true);
    elasticService.connect('http://localhost:9200');
    expect(this.ExternalSettingsService.getElasticsearchRootPath).toHaveBeenCalled();
    expect(this.ExternalSettingsService.withCredentials).toHaveBeenCalled();
    expect(elasticService.clusterRequest).toHaveBeenCalledWith('GET', '/', {},
        jasmine.any(Function), jasmine.any(Function));
    expect(elasticService.connection.host).toEqual('http://localhost:9200/testing');
    expect(elasticService.connection.withCredentials).toEqual(true);
    expect(this.AlertService.error).toHaveBeenCalledWith(
        'Error connecting to [http://localhost:9200/testing]',
        "whaaatt"
    );
    expect(elasticService.setVersion).not.toHaveBeenCalled();
  });

  it("should throw exception and register no connection if response has unexpected format",
      function() {
        $httpBackend.when('GET', 'http://localhost:9200/testing/').respond(200,
            {version: {number: 'ribeye'}});
        elasticService.connected = true;
        expect(elasticService.connection).toEqual(null);
        expect(elasticService.connected).toEqual(true);
        spyOn(this.ExternalSettingsService,
            'getElasticsearchRootPath').andReturn('/testing');
        spyOn(this.ExternalSettingsService, 'withCredentials').andReturn(true);
        elasticService.connect('http://localhost:9200');
        $httpBackend.flush();
        expect(this.ExternalSettingsService.getElasticsearchRootPath).toHaveBeenCalled();
        expect(this.ExternalSettingsService.withCredentials).toHaveBeenCalled();
        expect(elasticService.connected).toEqual(false);
      });

  it("Should set version when setVersion is called", function() {
    elasticService.setVersion('1.2.3');
    expect(elasticService.version.major).toEqual(1);
    expect(elasticService.version.minor).toEqual(2);
    expect(elasticService.version.build).toEqual(3);
    expect(elasticService.version.str).toEqual('1.2.3');
  });

  it("Should throw exception if setVersion is called with incorrect format",
      function() {
        expect(elasticService.connected).toEqual(false);
        expect(elasticService.autoRefreshStarted).toEqual(false);
        spyOn(elasticService, 'autoRefreshCluster').andReturn(true);
        expect(function() {
          elasticService.setVersion('this_is_not_correct');
        }).toThrow('Invalid Elasticsearch version[this_is_not_correct]');
        expect(elasticService.connected).toEqual(false);
        expect(elasticService.autoRefreshStarted).toEqual(false);
        expect(elasticService.autoRefreshCluster).not.toHaveBeenCalled();
      });

  it("Should correcty validate version check", function() {
    elasticService.version = {str: '1.2.3', major: 1, minor: 2, build: 3};
    expect(elasticService.versionCheck('1.2.2')).toEqual(true);
    expect(elasticService.versionCheck('1.2.3')).toEqual(true);
    expect(elasticService.versionCheck('1.2.4')).toEqual(false);
    expect(elasticService.versionCheck('1.3.1')).toEqual(false);
    expect(elasticService.versionCheck('2.1.1')).toEqual(false);
  });

  it("correctly sets auth information on connection", function() {
    spyOn(this.ExternalSettingsService,
        'getElasticsearchRootPath').andReturn('/');
    spyOn(elasticService, 'clusterRequest').andReturn();
    elasticService.connect('http://leo:pwd@localhost:9876');
    expect(elasticService.connection.host).toEqual('http://localhost:9876/');
    expect(elasticService.connection.auth).toEqual('Basic bGVvOnB3ZA==');
    expect(elasticService.clusterRequest).toHaveBeenCalledWith('GET', '/', {},
        jasmine.any(Function), jasmine.any(Function));
  });

  it("correctly sends request without auth information", function() {
    var connection = new ESConnection("http://localhost:9876/", false);
    elasticService.connection = connection;
    $httpBackend.expectGET('http://localhost:9876//',
        {"Accept": "application/json, text/plain, */*"}).respond(200, {});
    elasticService.clusterRequest('GET', '/', {}, function() {
    }, function() {
    });
    $httpBackend.flush();
  });

  it("correctly sets auth information on connection", function() {
    var connection = new ESConnection("http://leo:pwd@localhost:9876/", false);
    elasticService.connection = connection;
    $httpBackend.expectGET('http://localhost:9876//', {
      "Authorization": "Basic bGVvOnB3ZA==",
      "Accept": "application/json, text/plain, */*"
    }).respond(200, {});
    elasticService.clusterRequest('GET', '/', {}, function() {
    }, function() {
    });
    $httpBackend.flush();
  });

  it("should do nothing if no auth information is present", function() {
    elasticService.connection = {auth: undefined};
    var params = {};
    elasticService.addAuth(params);
    expect(params).toEqual(params);
  });

  it("should add withCredentials to params", function() {
    elasticService.connection = {auth: undefined, withCredentials: true};
    var params = {};
    elasticService.addAuth(params);
    expect(params).toEqual({withCredentials: true});
  });

  it("should add auth header to params", function() {
    elasticService.connection = {auth: "pfff", withCredentials: false};
    var params = {};
    elasticService.addAuth(params);
    expect(params).toEqual({headers: {Authorization: "pfff"}});
  });

  it("should add auth header and withCredentials to params", function() {
    elasticService.connection = {auth: "pfff", withCredentials: true};
    var params = {};
    elasticService.addAuth(params);
    expect(params).toEqual({
      headers: {Authorization: "pfff"},
      withCredentials: true
    });
  });

  it("should request cluster health", function() {
    spyOn(elasticService, 'clusterRequest').andReturn(true);
    elasticService.getClusterHealth();
    expect(elasticService.clusterRequest).toHaveBeenCalledWith(
        'GET',
        '/_cluster/health',
        {},
        jasmine.any(Function),
        jasmine.any(Function)
    );
  });

  it("should reset cluster health if loading cluster health fails", function() {
    elasticService.clusterHealth = "someValue";
    spyOn(this.AlertService, 'error').andReturn(true);
    elasticService.clusterRequest = function(m, u, b, s, error) {
      error('failed!!!!');
    };
    elasticService.getClusterHealth();
    expect(this.AlertService.error).toHaveBeenCalledWith(
        'Error refreshing cluster health',
        'failed!!!!'
    );
    expect(elasticService.clusterHealth).toEqual(undefined);
  });

  it("should reset cluster health if success throws an exception", function() {
    elasticService.connection = {host: 'whatever'};
    elasticService.clusterHealth = "someValue";
    spyOn(this.AlertService, 'error').andReturn(true);
    $httpBackend.when('GET', 'whatever/_cluster/health', {}).respond(200,
        undefined);
    elasticService.getClusterHealth();
    $httpBackend.flush();
    expect(this.AlertService.error).toHaveBeenCalled();
    expect(elasticService.clusterHealth).toEqual(undefined);
  });

  it("should reset cluster health if loading cluster health fails", function() {
    elasticService.clusterHealth = "someValue";
    spyOn(this.AlertService, 'error').andReturn(true);
    elasticService.clusterRequest = function(m, u, b, success, e) {
      success({});
    };
    elasticService.getClusterHealth();
    expect(elasticService.clusterHealth).not.toEqual(undefined);
  });

  it("resets service state", function() {
    elasticService.clusterHealth = "someValue";
    elasticService.cluster = "someValue";
    elasticService.connection = "someValue";
    elasticService.connected = true;
    elasticService.reset();
    expect(elasticService.clusterHealth).toEqual(undefined);
    expect(elasticService.cluster).toEqual(undefined);
    expect(elasticService.connection).toEqual(undefined);
    expect(elasticService.connected).toEqual(false);
  });

  it("auto refreshes cluster state", function() {
    spyOn(elasticService, 'refresh').andReturn();
    elasticService.autoRefreshCluster();
    expect(elasticService.refresh).toHaveBeenCalled();
    spyOn(elasticService, 'autoRefreshCluster');
    $timeout.flush();
    expect(elasticService.autoRefreshCluster).toHaveBeenCalled();
  });

  // TESTS API Methods
  it("creates index", function() {
    spyOn(elasticService, 'clusterRequest').andReturn(true);
    var body = {property: 'value'};
    elasticService.createIndex('name', body, 'success', 'error');
    expect(elasticService.clusterRequest).
        toHaveBeenCalledWith('POST', '/name', body, 'success', 'error');
  });

  it("enables shard allocation", function() {
    spyOn(elasticService, 'clusterRequest').andReturn(true);
    elasticService.enableShardAllocation('success', 'error');
    var path = '/_cluster/settings';
    var body = {
      transient: {
        'cluster.routing.allocation': {
          'enable': 'all',
          'disable_allocation': false
        }
      }
    };
    expect(elasticService.clusterRequest).
        toHaveBeenCalledWith('PUT', path, body, 'success', 'error');
  });

  it("disables shard allocation", function() {
    spyOn(elasticService, 'clusterRequest').andReturn(true);
    elasticService.disableShardAllocation('success', 'error');
    var path = '/_cluster/settings';
    var body = {
      transient: {
        'cluster.routing.allocation': {
          'enable': 'none',
          'disable_allocation': true
        }
      }
    };
    expect(elasticService.clusterRequest).
        toHaveBeenCalledWith('PUT', path, body, 'success', 'error');
  });

  it("shuts down node", function() {
    spyOn(elasticService, 'clusterRequest').andReturn(true);
    elasticService.shutdownNode('node_id', 'success', 'error');
    var path = '/_cluster/nodes/node_id/_shutdown';
    expect(elasticService.clusterRequest).
        toHaveBeenCalledWith('POST', path, {}, 'success', 'error');
  });

  it("shuts down node", function() {
    spyOn(elasticService, 'clusterRequest').andReturn(true);
    elasticService.shutdownNode('node_id', 'success', 'error');
    var path = '/_cluster/nodes/node_id/_shutdown';
    expect(elasticService.clusterRequest).
        toHaveBeenCalledWith('POST', path, {}, 'success', 'error');
  });

  it("opens an index", function() {
    spyOn(elasticService, 'clusterRequest').andReturn(true);
    elasticService.openIndex('index_name', 'success', 'error');
    var path = '/index_name/_open';
    expect(elasticService.clusterRequest).
        toHaveBeenCalledWith('POST', path, {}, 'success', 'error');
  });

  it("optimizes an index", function() {
    spyOn(elasticService, 'clusterRequest').andReturn(true);
    elasticService.optimizeIndex('index_name', 'success', 'error');
    var path = '/index_name/_optimize';
    expect(elasticService.clusterRequest).
        toHaveBeenCalledWith('POST', path, {}, 'success', 'error');
  });

  it("clears index cache", function() {
    spyOn(elasticService, 'clusterRequest').andReturn(true);
    elasticService.clearCache('index_name', 'success', 'error');
    var path = '/index_name/_cache/clear';
    expect(elasticService.clusterRequest).
        toHaveBeenCalledWith('POST', path, {}, 'success', 'error');
  });

  it("closes an index", function() {
    spyOn(elasticService, 'clusterRequest').andReturn(true);
    elasticService.closeIndex('index_name', 'success', 'error');
    var path = '/index_name/_close';
    expect(elasticService.clusterRequest).
        toHaveBeenCalledWith('POST', path, {}, 'success', 'error');
  });

  it("refreshes an index", function() {
    spyOn(elasticService, 'clusterRequest').andReturn(true);
    elasticService.refreshIndex('index_name', 'success', 'error');
    var path = '/index_name/_refresh';
    expect(elasticService.clusterRequest).
        toHaveBeenCalledWith('POST', path, {}, 'success', 'error');
  });

  it("deletes an index", function() {
    spyOn(elasticService, 'clusterRequest').andReturn(true);
    elasticService.deleteIndex('index_name', 'success', 'error');
    var path = '/index_name';
    expect(elasticService.clusterRequest).
        toHaveBeenCalledWith('DELETE', path, {}, 'success', 'error');
  });

  it("updates an index settings", function() {
    spyOn(elasticService, 'clusterRequest').andReturn(true);
    elasticService.updateIndexSettings('index_name', {setting: 'settingValue'},
        'success', 'error');
    var path = '/index_name/_settings';
    expect(elasticService.clusterRequest).
        toHaveBeenCalledWith('PUT', path, {setting: 'settingValue'}, 'success',
        'error');
  });

  it("updates the cluster settings", function() {
    spyOn(elasticService, 'clusterRequest').andReturn(true);
    elasticService.updateClusterSettings({setting: 'settingValue'}, 'success',
        'error');
    var path = '/_cluster/settings';
    expect(elasticService.clusterRequest).
        toHaveBeenCalledWith('PUT', path, {setting: 'settingValue'}, 'success',
        'error');
  });

  it("retrieves index metadata", function() {
    spyOn(elasticService, 'clusterRequest').andReturn(true);
    elasticService.updateClusterSettings({setting: 'settingValue'}, 'success',
        'error');
    var path = '/_cluster/settings';
    expect(elasticService.clusterRequest).
        toHaveBeenCalledWith('PUT', path, {setting: 'settingValue'}, 'success',
        'error');
  });

  it("deletes a warmer", function() {
    spyOn(elasticService, 'clusterRequest').andReturn(true);
    var warmer = new Warmer("warmerId", "indexName", {});
    elasticService.deleteWarmer(warmer, 'success', 'error');
    var path = '/' + warmer.index + '/_warmer/' + warmer.id;
    expect(elasticService.clusterRequest).
        toHaveBeenCalledWith('DELETE', path, {}, 'success', 'error');
  });

  it("deletes a percolator", function() {
    spyOn(elasticService, 'clusterRequest').andReturn(true);
    elasticService.deletePercolatorQuery('indexName', 'percolatorId', 'success',
        'error');
    var path = '/indexName/.percolator/percolatorId'
    expect(elasticService.clusterRequest).
        toHaveBeenCalledWith('DELETE', path, {}, 'success', 'error');
  });

  it("creates a percolator query", function() {
    spyOn(elasticService, 'clusterRequest').andReturn(true);
    var percolator = new PercolateQuery({
      _index: 'indexName',
      _id: 'percolatorId',
      _source: {some: 'data'}
    });
    elasticService.createPercolatorQuery(percolator, 'success', 'error');
    var path = '/indexName/.percolator/percolatorId'
    expect(elasticService.clusterRequest).
        toHaveBeenCalledWith('PUT', path, {some: 'data'}, 'success', 'error');
  });

  it("creates a repository", function() {
    spyOn(elasticService, 'clusterRequest').andReturn(true);
    elasticService.createRepository('repo', {set: 'tings'}, 'success', 'error');
    var path = '/_snapshot/repo'
    expect(elasticService.clusterRequest).
        toHaveBeenCalledWith('POST', path, {set: 'tings'}, 'success', 'error');
  });

  it("deletes a repository", function() {
    spyOn(elasticService, 'clusterRequest').andReturn(true);
    elasticService.deleteRepository('repo', 'success', 'error');
    var path = '/_snapshot/repo'
    expect(elasticService.clusterRequest).
        toHaveBeenCalledWith('DELETE', path, {}, 'success', 'error');
  });

  it("deletes a snapshot", function() {
    spyOn(elasticService, 'clusterRequest').andReturn(true);
    elasticService.deleteSnapshot('repo', 'snap', 'success', 'error');
    var path = '/_snapshot/repo/snap'
    expect(elasticService.clusterRequest).
        toHaveBeenCalledWith('DELETE', path, {}, 'success', 'error');
  });

  it("restores a snapshot", function() {
    spyOn(elasticService, 'clusterRequest').andReturn(true);
    elasticService.restoreSnapshot('repo', 'snap', {some: 'settings'},
        'success', 'error');
    var path = '/_snapshot/repo/snap/_restore'
    expect(elasticService.clusterRequest).
        toHaveBeenCalledWith('POST', path, {some: 'settings'}, 'success',
        'error');
  });

  it("restores a snapshot", function() {
    spyOn(elasticService, 'clusterRequest').andReturn(true);
    elasticService.restoreSnapshot('repo', 'snap', {some: 'settings'},
        'success', 'error');
    var path = '/_snapshot/repo/snap/_restore'
    expect(elasticService.clusterRequest).
        toHaveBeenCalledWith('POST', path, {some: 'settings'}, 'success',
        'error');
  });

  it("creates a snapshot", function() {
    spyOn(elasticService, 'clusterRequest').andReturn(true);
    elasticService.createSnapshot('repo', 'snap', {some: 'settings'}, 'success',
        'error');
    var path = '/_snapshot/repo/snap'
    expect(elasticService.clusterRequest).
        toHaveBeenCalledWith('PUT', path, {some: 'settings'}, 'success',
        'error');
  });

  it("executes a benchmark", function() {
    spyOn(elasticService, 'clusterRequest').andReturn(true);
    elasticService.executeBenchmark({some: 'settings'}, 'success', 'error');
    var path = '/_bench'
    expect(elasticService.clusterRequest).
        toHaveBeenCalledWith('PUT', path, {some: 'settings'}, 'success',
        'error');
  });

  it("registers a warmer query without types", function() {
    spyOn(elasticService, 'clusterRequest').andReturn(true);
    var warmer = new Warmer("wId", "idx", {source: {}});
    elasticService.registerWarmer(warmer, 'success', 'error');
    var path = "/idx/_warmer/wId";
    expect(elasticService.clusterRequest).
        toHaveBeenCalledWith('PUT', path, {}, 'success', 'error');
  });

  it("registers a warmer query with types", function() {
    spyOn(elasticService, 'clusterRequest').andReturn(true);
    var warmer = new Warmer("wId", "idx", {types: 'whatever', source: {}});
    elasticService.registerWarmer(warmer, 'success', 'error');
    var path = "/idx/whatever/_warmer/wId";
    expect(elasticService.clusterRequest).
        toHaveBeenCalledWith('PUT', path, {}, 'success', 'error');
  });

  it("updates aliases", function() {
    spyOn(elasticService, 'clusterRequest').andReturn(true);
    var add = [new Alias('adding_alias', 'idx', '', '', '')];
    var rem = [new Alias('removing_alias', 'idx', '', '', '')];
    var body = {
      actions: [
        {add: {index: 'idx', alias: 'adding_alias', filter: ''}},
        {remove: {index: 'idx', alias: 'removing_alias', filter: ''}}
      ]
    };
    elasticService.updateAliases(add, rem, 'success', 'error');
    expect(elasticService.clusterRequest).
        toHaveBeenCalledWith('POST', '/_aliases', body, 'success', 'error');
  });

});
