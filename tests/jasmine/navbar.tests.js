'use strict';

describe('NavbarController', function() {
  var scope, createController;

  beforeEach(angular.mock.module('kopf'));


  beforeEach(function() {
    module('kopf');
    var mock = {
      isConnected: function() { return true;  },
      connection: { host: 'http://localhost:9200' },
      getHost: function() { return 'http://localhost:9200' },
      connect: function() {}
    };
    module(function($provide) {
      $provide.value('ElasticService', mock);
    });
  });

  beforeEach(angular.mock.inject(function($rootScope, $controller, $injector) {
    this.scope = $rootScope.$new();
    this.ElasticService = $injector.get('ElasticService');
    this.ElasticService.connection = { host: 'http://localhost:9200'};
    this.ThemeService = $injector.get('ThemeService');
    this.SettingsService = $injector.get('SettingsService');
    this.AlertService = $injector.get('AlertService');
    this.HostHistoryService = $injector.get('HostHistoryService');
    this.DebugService = $injector.get('DebugService');

    this.createController = function() {
      return $controller('NavbarController', {$scope: this.scope},
          this.SettingsService, this.ThemeService, this.ElasticService,
          this.AlertService, this.HostHistoryService, this.DebugService);
    };
    this._controller = this.createController();
  }));

  it('init', function() {
    expect(this.scope.host_history).toEqual([ { host : 'http://localhost11' }, { host : 'http://localhost10' }, { host : 'http://localhost9' }, { host : 'http://localhost8' }, { host : 'http://localhost7' }, { host : 'http://localhost6' }, { host : 'http://localhost5' }, { host : 'http://localhost4' }, { host : 'http://localhost3' }, { host : 'http://localhost2' } ]);
    expect(this.scope.debugEnabled).toEqual(false);
    expect(this.scope.theme).toEqual('dark');
    expect(this.scope.new_host).toEqual('');
    expect(this.scope.clusterStatus).toEqual(undefined);
    expect(this.scope.clusterName).toEqual(undefined);
    expect(this.scope.fetchedAt).toEqual(undefined);
    expect(this.scope.current_host).toEqual('http://localhost:9200');
  });

  it('should connect to a different host', function() {
    spyOn(this.ElasticService, 'connect').andReturn(true);
    this.ElasticService.connection = { host: "http://newhost:1234"};
    this.ElasticService.refresh = function() {
    };
    spyOn(this.ElasticService, 'refresh').andReturn(true);
    spyOn(this.HostHistoryService, 'addToHistory').andReturn(true);
    spyOn(this.HostHistoryService, 'getHostHistory').andReturn(['waaasss']);
    this.scope.connectToHost("http://newhost:1234");
    expect(this.ElasticService.connect).toHaveBeenCalledWith("http://newhost:1234");
    expect(this.ElasticService.refresh).toHaveBeenCalled();
    expect(this.scope.current_host).toEqual("http://newhost:1234");
    expect(this.HostHistoryService.addToHistory).toHaveBeenCalledWith("http://newhost:1234");
    expect(this.scope.host_history).toEqual(['waaasss']);
  });

  it('should handle error when connecting to a different host', function() {
    spyOn(this.ElasticService, 'connect').andThrow('pffff');
    this.ElasticService.connection = { host: "http://newhost:1234"};
    this.ElasticService.refresh = function() {
    };
    spyOn(this.ElasticService, 'refresh').andReturn(true);
    spyOn(this.AlertService, 'error').andReturn(true);
    this.scope.connectToHost("http://newhost:1234");
    expect(this.ElasticService.connect).toHaveBeenCalledWith("http://newhost:1234");
    expect(this.ElasticService.refresh).toHaveBeenCalled();
    expect(this.scope.current_host).toEqual("http://newhost:1234");
    expect(this.AlertService.error).toHaveBeenCalledWith("Error while connecting to new target host",
        "pffff");
  });

  it('should change the target for the ElasticService and refresh cluster state when enter is pressed',
      function() {
        this.ElasticService.connect = function() {
        };
        spyOn(this.ElasticService, 'connect').andReturn(true);
        this.ElasticService.refresh = function() {
        };
        spyOn(this.ElasticService, 'refresh').andReturn(true);
        this.scope.new_host = "http://newhost:1234";
        expect(this.scope.current_host).toEqual("http://localhost:9200");
        this.scope.handleConnectToHost({keyCode: 13}); // 13 = enter key code
        expect(this.ElasticService.connect).toHaveBeenCalledWith("http://newhost:1234");
        expect(this.ElasticService.refresh).toHaveBeenCalled();
      });

  it('should NOT change the target for the ElasticService if enter is not pressed',
      function() {
        spyOn(this.ElasticService, 'connect').andReturn(true);
        this.ElasticService.refresh = function() {
        };
        spyOn(this.ElasticService, 'refresh').andReturn(true);
        this.scope.new_host = "http://newhost:1234";
        this.scope.handleConnectToHost({keyCode: 12}); // 13 = enter key code
        expect(this.ElasticService.connect).not.toHaveBeenCalled();
        expect(this.ElasticService.refresh).not.toHaveBeenCalled();
      });

  it('should NOT change the target for the ElasticService and refresh cluster state if not value is specified',
      function() {
        spyOn(this.ElasticService, 'connect').andReturn(true);
        this.ElasticService.refresh = function() {
        };
        spyOn(this.ElasticService, 'refresh').andReturn(true);
        this.scope.new_host = "";
        this.scope.handleConnectToHost({keyCode: 13}); // 13 = enter key code
        expect(this.ElasticService.connect).not.toHaveBeenCalled();
        expect(this.ElasticService.refresh).not.toHaveBeenCalled();
      });

  it('should NOT change the target for the ElasticService and refresh cluster state if not value is specified',
      function() {
        spyOn(this.ElasticService, 'connect').andThrow("Y U NO CONNECT");
        spyOn(this.AlertService, 'error').andReturn(true);
        this.ElasticService.refresh = function() {
        };
        spyOn(this.ElasticService, 'refresh').andReturn(true);
        this.scope.new_host = "a";
        this.scope.handleConnectToHost({keyCode: 13}); // 13 = enter key code
        expect(this.ElasticService.connect).toHaveBeenCalled();
        expect(this.AlertService.error).toHaveBeenCalledWith("Error while connecting to new target host",
            "Y U NO CONNECT");
      });


  it('should change the refresh interval with value of new_refresh',
      function() {
        spyOn(this.SettingsService, 'setRefreshInterval').andReturn(true);
        this.scope.new_refresh = 1000;
        this.scope.changeRefresh();
        expect(this.SettingsService.setRefreshInterval).toHaveBeenCalledWith(1000);
      });

  it('should change theme with value of theme', function() {
    spyOn(this.ThemeService, 'setTheme').andReturn(true);
    this.scope.theme = "dark";
    this.scope.changeTheme();
    expect(this.ThemeService.setTheme).toHaveBeenCalledWith("dark");
  });

  it('should update current host when connecting to a new host', function() {
    spyOn(this.ElasticService, 'getHost').andReturn('http://newhost:9200');
    expect(this.scope.current_host).toEqual('http://localhost:9200');
    this.scope.$digest();
    expect(this.ElasticService.getHost).toHaveBeenCalled();
    expect(this.scope.current_host).toEqual('http://newhost:9200');
  });

});