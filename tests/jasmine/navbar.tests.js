'use strict';

describe('NavbarController', function() {
    var scope, createController;

    beforeEach(angular.mock.module('kopf'));

    beforeEach(angular.mock.inject(function ($rootScope, $controller, $injector) {
        this.scope = $rootScope.$new();
        this.ElasticService = $injector.get('ElasticService');
        this.ElasticService.connection = { host: 'http://localhost:9200'};
        this.ThemeService = $injector.get('ThemeService');
        this.SettingsService = $injector.get('SettingsService');
        this.AlertService = $injector.get('AlertService');

        this.createController = function () {
            return $controller('NavbarController', {$scope: this.scope}, this.SettingsService, this.ThemeService, this.ElasticService, this.AlertService);
        };
        this._controller = this.createController();
    }));

    //TESTS
    it('should change the target for the ElasticService and refresh cluster state when enter is pressed', function() {
        spyOn(this.ElasticService, 'connect').andReturn(true);
        this.scope.refreshClusterState=function() {};
        spyOn(this.scope, 'refreshClusterState').andReturn(true);
        this.scope.new_host = "http://newhost:1234";
        expect(this.scope.current_host).toEqual("http://localhost:9200");
        this.scope.connectToHost({keyCode: 13}); // 13 = enter key code
        expect(this.ElasticService.connect).toHaveBeenCalledWith("http://newhost:1234");
        expect(this.scope.refreshClusterState).toHaveBeenCalled();
    });

    it('should NOT change the target for the ElasticService if enter is not pressed', function() {
        spyOn(this.ElasticService, 'connect').andReturn(true);
        this.scope.refreshClusterState=function() {};
        spyOn(this.scope, 'refreshClusterState').andReturn(true);
        this.scope.new_host = "http://newhost:1234";
        this.scope.connectToHost({keyCode: 12}); // 13 = enter key code
        expect(this.ElasticService.connect).not.toHaveBeenCalled();
        expect(this.scope.refreshClusterState).not.toHaveBeenCalled();
    });

    it('should NOT change the target for the ElasticService and refresh cluster state if not value is specified', function() {
        spyOn(this.ElasticService, 'connect').andReturn(true);
        this.scope.refreshClusterState=function() {};
        spyOn(this.scope, 'refreshClusterState').andReturn(true);
        this.scope.new_host = "";
        this.scope.connectToHost({keyCode: 13}); // 13 = enter key code
        expect(this.ElasticService.connect).not.toHaveBeenCalled();
        expect(this.scope.refreshClusterState).not.toHaveBeenCalled();
    });

    it('should NOT change the target for the ElasticService and refresh cluster state if not value is specified', function() {
        spyOn(this.ElasticService, 'connect').andThrow("Y U NO CONNECT");
        spyOn(this.AlertService, 'error').andReturn(true);
        this.scope.refreshClusterState=function() {};
        spyOn(this.scope, 'refreshClusterState').andReturn(true);
        this.scope.new_host = "a";
        this.scope.connectToHost({keyCode: 13}); // 13 = enter key code
        expect(this.ElasticService.connect).toHaveBeenCalled();
        expect(this.AlertService.error).toHaveBeenCalledWith("Error while connecting to new target host", "Y U NO CONNECT");
    });


    it('should change the refresh interval with value of new_refresh', function() {
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

});