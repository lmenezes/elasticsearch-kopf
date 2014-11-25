"use strict";

describe("ElasticService", function() {
  var elasticService, $http, $httpBackend;

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
    this.ExternalSettingsService = $injector.get('ExternalSettingsService');
    $http = $injector.get('$http');
    $httpBackend = $injector.get('$httpBackend');
  }));

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  it("should fetch cluster version and set connection info if request is successfull",
      function() {
        expect(elasticService.connection).toEqual(null);
        spyOn(this.ExternalSettingsService,
            'getElasticsearchRootPath').andReturn('/testing');
        spyOn(this.ExternalSettingsService, 'withCredentials').andReturn(true);
        elasticService.clusterRequest = function(method, path, data, success,
                                                 fail) {
          success({version: {number: '1.9.13'}});
        };
        spyOn(elasticService, 'clusterRequest').andCallThrough();
        spyOn(elasticService, 'setVersion').andCallThrough();
        elasticService.connect('http://localhost:9200');
        expect(this.ExternalSettingsService.getElasticsearchRootPath).toHaveBeenCalled();
        expect(this.ExternalSettingsService.withCredentials).toHaveBeenCalled();
        expect(elasticService.clusterRequest).toHaveBeenCalledWith('GET', '/',
            {}, jasmine.any(Function), jasmine.any(Function));
        expect(elasticService.connection.host).toEqual('http://localhost:9200/testing');
        expect(elasticService.connection.withCredentials).toEqual(true);
        expect(elasticService.setVersion).toHaveBeenCalledWith('1.9.13');
      });

  it("should handle an error while requesting version", function() {
    expect(elasticService.connection).toEqual(null);
    spyOn(this.ExternalSettingsService,
        'getElasticsearchRootPath').andReturn('/testing');
    spyOn(this.ExternalSettingsService, 'withCredentials').andReturn(true);
    elasticService.clusterRequest = function(method, path, data, success,
                                             fail) {
      fail("whaaatt");
    };
    spyOn(elasticService, 'clusterRequest').andCallThrough();
    spyOn(elasticService, 'setVersion').andCallThrough();
    expect(function() {
      elasticService.connect('http://localhost:9200');
    }).toThrow({
      message: 'Error connecting to [http://localhost:9200/testing]',
      body: "whaaatt"
    });

    expect(this.ExternalSettingsService.getElasticsearchRootPath).toHaveBeenCalled();
    expect(this.ExternalSettingsService.withCredentials).toHaveBeenCalled();
    expect(elasticService.clusterRequest).toHaveBeenCalledWith('GET', '/', {},
        jasmine.any(Function), jasmine.any(Function));
    expect(elasticService.connection.host).toEqual('http://localhost:9200/testing');
    expect(elasticService.connection.withCredentials).toEqual(true);
    expect(elasticService.setVersion).not.toHaveBeenCalled();
  });

  it("should throw exception and register no connection if response has unexpected format",
      function() {
        elasticService.connected = true;
        expect(elasticService.connection).toEqual(null);
        expect(elasticService.connected).toEqual(true);
        spyOn(this.ExternalSettingsService,
            'getElasticsearchRootPath').andReturn('/testing');
        spyOn(this.ExternalSettingsService, 'withCredentials').andReturn(true);
        elasticService.clusterRequest = function(method, path, data, success,
                                                 fail) {
          success({});
        };
        spyOn(elasticService, 'clusterRequest').andCallThrough();
        spyOn(elasticService, 'setVersion').andThrow("plof");
        expect(function() {
          elasticService.connect('http://localhost:9200');
        }).toThrow({
          message: 'Error reading cluster version',
          body: {}
        });
        expect(this.ExternalSettingsService.getElasticsearchRootPath).toHaveBeenCalled();
        expect(this.ExternalSettingsService.withCredentials).toHaveBeenCalled();
        expect(elasticService.clusterRequest).toHaveBeenCalledWith('GET', '/',
            {}, jasmine.any(Function), jasmine.any(Function));
        expect(elasticService.connected).toEqual(false);
      });

  it("Should set all connection data when setVersion is called", function() {
    expect(elasticService.connected).toEqual(false);
    expect(elasticService.autoRefreshStarted).toEqual(false);
    spyOn(elasticService, 'autoRefreshCluster').andReturn(true);
    elasticService.setVersion('1.2.3');
    expect(elasticService.connected).toEqual(true);
    expect(elasticService.autoRefreshStarted).toEqual(true);
    expect(elasticService.autoRefreshCluster).toHaveBeenCalled();
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


});
