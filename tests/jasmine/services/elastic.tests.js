"use strict";

describe("ElasticService", function () {
  var elasticService, $http;

  beforeEach(module("kopf"));

  beforeEach(function() {
    module('kopf');
    module(function($provide) {
      $provide.value('ExternalSettingsService', {
        getElasticsearchRootPath: function() {},
        withCredentials: function() {}
      });
    });
  });

  beforeEach(inject(function ($injector) {
    elasticService = $injector.get('ElasticService');
    this.ExternalSettingsService = $injector.get('ExternalSettingsService');
    $http = $injector.get('$http');
  }));

  it("should fetch cluster version and set connection info if request is successfull", function () {
    expect(elasticService.connection).toEqual(null);
    spyOn(this.ExternalSettingsService, 'getElasticsearchRootPath').andReturn('/testing');
    spyOn(this.ExternalSettingsService, 'withCredentials').andReturn(true);
    elasticService.clusterRequest = function(method, path, data, success, fail) {
      success({version: {number: '1.9.13'}});
    };
    spyOn(elasticService, 'clusterRequest').andCallThrough();
    spyOn(elasticService, 'setVersion').andCallThrough();
    elasticService.connect('http://localhost:9200');
    expect(this.ExternalSettingsService.getElasticsearchRootPath).toHaveBeenCalled();
    expect(this.ExternalSettingsService.withCredentials).toHaveBeenCalled();
    expect(elasticService.clusterRequest).toHaveBeenCalledWith('GET', '/', {}, jasmine.any(Function), jasmine.any(Function));
    expect(elasticService.connection.host).toEqual('http://localhost:9200/testing');
    expect(elasticService.connection.withCredentials).toEqual(true);
    expect(elasticService.setVersion).toHaveBeenCalledWith('1.9.13');
  });

  it("should handle an error while requesting version", function () {
    expect(elasticService.connection).toEqual(null);
    spyOn(this.ExternalSettingsService, 'getElasticsearchRootPath').andReturn('/testing');
    spyOn(this.ExternalSettingsService, 'withCredentials').andReturn(true);
    elasticService.clusterRequest = function(method, path, data, success, fail) {
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
    expect(elasticService.clusterRequest).toHaveBeenCalledWith('GET', '/', {}, jasmine.any(Function), jasmine.any(Function));
    expect(elasticService.connection.host).toEqual('http://localhost:9200/testing');
    expect(elasticService.connection.withCredentials).toEqual(true);
    expect(elasticService.setVersion).not.toHaveBeenCalled();
  });

  it("should throw exception and register no connection if response has unexpected format", function () {
    elasticService.connected= true;
    expect(elasticService.connection).toEqual(null);
    expect(elasticService.connected).toEqual(true);
    spyOn(this.ExternalSettingsService, 'getElasticsearchRootPath').andReturn('/testing');
    spyOn(this.ExternalSettingsService, 'withCredentials').andReturn(true);
    elasticService.clusterRequest = function(method, path, data, success, fail) {
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
    expect(elasticService.clusterRequest).toHaveBeenCalledWith('GET', '/', {}, jasmine.any(Function), jasmine.any(Function));
    expect(elasticService.connected).toEqual(false);
  });

  it("Should set all connection data when setVersion is called", function () {
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

  it("Should throw exception if setVersion is called with incorrect format", function () {
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

  it("Should correcty validate version check", function () {
    elasticService.version = {str: '1.2.3', major: 1, minor: 2, build: 3};
    expect(elasticService.versionCheck('1.2.2')).toEqual(true);
    expect(elasticService.versionCheck('1.2.3')).toEqual(true);
    expect(elasticService.versionCheck('1.2.4')).toEqual(false);
    expect(elasticService.versionCheck('1.3.1')).toEqual(false);
    expect(elasticService.versionCheck('2.1.1')).toEqual(false);
  });

});
