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

  it("should fetch cluster version when connect is called", function () {
    expect(elasticService.connection).toEqual(null);
    spyOn(this.ExternalSettingsService, 'getElasticsearchRootPath').andReturn('/testing');
    spyOn(this.ExternalSettingsService, 'withCredentials').andReturn(true);
    elasticService.connect('http://localhost:9200');
    expect(this.ExternalSettingsService.getElasticsearchRootPath).toHaveBeenCalled();
    expect(this.ExternalSettingsService.withCredentials).toHaveBeenCalled();
    expect(elasticService.connection.host).toEqual('http://localhost:9200/testing');
    expect(elasticService.connection.with_credentials).toEqual(true);
  });


//  this.connect = function(host) {
//    var root = ExternalSettingsService.getElasticsearchRootPath();
//    this.withCredentials = ExternalSettingsService.withCredentials();
//    var url = host + root;
//    this.connection = new ESConnection(url, this.withCredentials);
//    var params = {method: 'GET', url: url,
//      withCredentials: this.withCredentials};
//    $http(params).
//        success(function(data) {
//          instance.handleSuccessfulConnect(data);
//        }).
//        error(function(data) {
//          this.connected = false;
//          throw {message: 'Error connecting to [' + url + ']', body: data};
//        });
//  };

});