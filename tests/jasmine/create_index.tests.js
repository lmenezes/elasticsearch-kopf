'use strict';

describe('CreateIndexController', function() {
    var scope, createController;

    beforeEach(angular.mock.module('kopf'));

    beforeEach(angular.mock.inject(function ($rootScope, $controller, $injector) {
        this.scope = $rootScope.$new();
        this.AlertService = $injector.get('AlertService');
        this.ElasticService = $injector.get('ElasticService');
        this.ElasticService.client = {};
        this.createController = function () {
            return $controller('CreateIndexController', {$scope: this.scope}, this.AlertService, this.ElasticService);
        };
        this._controller = this.createController();
    }));

    //TESTS
    it('init : values are set', function () {
        expect(this.scope.source_index).toEqual(null);
        expect(this.scope.shards).toEqual('');
        expect(this.scope.replicas).toEqual('');
        expect(this.scope.name).toEqual('');
        expect(this.scope.indices).toEqual([]);
    });

    it('should correctly load settings from an existing index', function() {
        this.scope.source_index = 'original';
        this.scope.editor = { setValue: {} };
        var metadata = { settings: { any: true }, mappings: { whatever: true }};
        this.ElasticService.client.getIndexMetadata=function(name, success, error) {
          success(metadata);
        };
        spyOn(this.ElasticService.client, 'getIndexMetadata').andCallThrough();
        spyOn(this.scope.editor, 'setValue').andReturn();
        this.scope.updateEditor();
        expect(this.ElasticService.client.getIndexMetadata).toHaveBeenCalledWith("original", jasmine.any(Function), jasmine.any(Function));
        expect(this.scope.editor.setValue).toHaveBeenCalledWith(JSON.stringify(metadata, null, 2));
    });

    it('should display error message if there is an error while fetching index data', function() {
        this.scope.source_index = 'original';
        this.ElasticService.client.getIndexMetadata=function(name, success, error) {
            error("kaput");
        };
        spyOn(this.ElasticService.client, 'getIndexMetadata').andCallThrough();
        spyOn(this.AlertService, 'error').andReturn();
        this.scope.updateEditor();
        expect(this.ElasticService.client.getIndexMetadata).toHaveBeenCalledWith("original", jasmine.any(Function), jasmine.any(Function));
        expect(this.AlertService.error).toHaveBeenCalledWith("Error while loading index settings", "kaput");
    });

    it('should prevent attempting creating an index when no name is input', function() {
        this.scope.name = '';
        spyOn(this.AlertService, 'error').andReturn();
        this.scope.createIndex();
        expect(this.AlertService.error).toHaveBeenCalledWith("You must specify a valid index name");
    });

    it('should warn of invalid json', function() {
        this.scope.name = 'new_index';
        this.scope.editor = { format: function() { return {}; }, error: "Y U NO PARSE" };
        this.scope.refreshClusterState = function() {};
        spyOn(this.AlertService, 'error').andReturn();
        this.scope.createIndex();
        expect(this.AlertService.error).toHaveBeenCalledWith("Invalid JSON: Y U NO PARSE");
    });

    it('should correctly create an index with the given settings', function() {
        this.scope.name = 'new_index';
        this.scope.refreshClusterState = function() {};
        this.scope.editor = { format: function() { return JSON.stringify({ settings: { } }); } };
        this.ElasticService.client.createIndex=function(name, body, success, error) {
            success();
        };
        spyOn(this.ElasticService.client, 'createIndex').andCallThrough();
        spyOn(this.scope, 'refreshClusterState').andReturn();
        this.scope.createIndex();
        expect(this.ElasticService.client.createIndex).toHaveBeenCalledWith("new_index", JSON.stringify({ settings: { } }), jasmine.any(Function), jasmine.any(Function));
        expect(this.scope.refreshClusterState).toHaveBeenCalled();
    });

    it('should read shards and replicas settings and settings body is empty', function() {
        this.scope.name = 'new_index';
        this.scope.shards = '4';
        this.scope.replicas = '5';
        this.scope.refreshClusterState = function() {};
        this.scope.editor = { format: function() { return JSON.stringify({}); } };
        this.ElasticService.client.createIndex=function(name, body, success, error) {
            success();
        };
        spyOn(this.ElasticService.client, 'createIndex').andCallThrough();
        spyOn(this.scope, 'refreshClusterState').andReturn();
        this.scope.createIndex();
        expect(this.ElasticService.client.createIndex).toHaveBeenCalledWith("new_index", '{"settings":{"index":{"number_of_shards":"4","number_of_replicas":"5"}}}', jasmine.any(Function), jasmine.any(Function));
        expect(this.scope.refreshClusterState).toHaveBeenCalled();
    });

});