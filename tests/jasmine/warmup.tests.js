'use strict';

describe('WarmupController', function(){
    var scope, createController;

    beforeEach(angular.mock.module('kopf'));
    
    beforeEach(angular.mock.inject(function($rootScope, $controller, $injector){
        //create an empty scope
        this.scope = $rootScope.$new();
        this.scope.client = {}         //set fake client
        var $timeout = $injector.get('$timeout');
        var $location = $injector.get('$location');
        this.ConfirmDialogService = $injector.get('ConfirmDialogService');
        this.AlertService = $injector.get('AlertService');
        this.AceEditorService = $injector.get('AceEditorService');

        this.createController = function() {
            return $controller('WarmupController', {$scope: this.scope}, $location, $timeout, this.ConfirmDialogService, this.AlertService, this.AceEditorService);
        };

        this._controller = this.createController();
    }));

    /* TESTS */

    it('Initial values are correct', function(){
        expect(this.scope.index).toEqual(null);
        expect(this.scope.pagination.warmer_id).toEqual("");
        expect(this.scope.pagination.getPage()).toEqual({});
        expect(this.scope.indices).toEqual([]);
        expect(this.scope.editor).toEqual(undefined);
        expect(this.scope.warmer.id).toEqual("");
        expect(this.scope.warmer.index).toEqual("");
        expect(this.scope.warmer.source).toEqual({});
        expect(this.scope.warmer.types).toEqual([]);
    });

    it('Initializes data when warmup tab is selected', function() {
        spyOn(this.scope, 'loadIndices').andReturn(true);
        spyOn(this.scope, 'initEditor').andReturn(true);
        this.scope.$emit("loadWarmupEvent");
        expect(this.scope.loadIndices).toHaveBeenCalled();
        expect(this.scope.initEditor).toHaveBeenCalled();
    });

    it('Loads indices from cluster', function() {
        this.scope.cluster = { 'indices': ['a', 'b', 'c']}
        this.scope.loadIndices();
        expect(this.scope.indices).toEqual(['a', 'b', 'c']);
    });

    it('Returns total number of warmers', function() {
        this.scope.pagination.setResults([new Warmer("warmer_id","index", { types: [], source: {}}), new Warmer("warmer_id2","index", { types: [], source: {}})]);
        expect(this.scope.pagination.total()).toEqual(2);
    });

    it('Prevent warmup with empty body to be created', function() {
        var editor = {
            error : undefined,
            format : function(){return ''; },
            hasContent: function(){return false;}
        };
        spyOn(this.AlertService, "error");
        this.scope.editor = editor;
        this.scope.createWarmerQuery();
        expect(this.AlertService.error).toHaveBeenCalled();
    });

    it('Prevent warmup with invalid body to be created', function() {
        var editor = {
            error : 'Invalid JSON',
            format : function(){return '{ "whatever" }'; },
            getValue : function(){return '{ "whatever" }'; },
            hasContent: function(){return true;}
        };
        this.scope.editor = editor;
        this.scope.createWarmerQuery();
    });

    it('Attempts creating a valid Warmup query', function() {
        var editor = {
            error : undefined,
            format : function(){return '{ "query": { "match_all": {} } }'; },
            getValue : function(){return '{ "query": { "match_all": {} } }'; },
            hasContent: function(){return true;}
        };
        var warmer = new Warmer("warmer_id", "index_name", { types: "type", source: {} });
        this.scope.warmer = warmer;
        this.scope.editor = editor;
        this.scope.client.registerWarmupQuery = function(){};
        this.scope.updateModel = function(){};
        spyOn(this.scope.client, "registerWarmupQuery").andReturn(true);
        this.scope.createWarmerQuery();
        expect(this.scope.warmer.source).toEqual(editor.getValue());
        expect(this.scope.client.registerWarmupQuery).toHaveBeenCalledWith(warmer,
                                                                jasmine.any(Function),
                                                                jasmine.any(Function));
    });

    it('Loads index warmers for index and all types', function() {
        this.scope.index = "index_name";
        this.scope.client.getIndexWarmers = function(){};
        spyOn(this.scope.client, "getIndexWarmers").andReturn(true);
        this.scope.warmer = new Warmer('', 'index_name', {});
        this.scope.loadIndexWarmers();
        expect(this.scope.client.getIndexWarmers).toHaveBeenCalledWith("index_name", '', jasmine.any(Function), jasmine.any(Function));
    });

    it('Loads index warmers for index and specific type', function() {
        this.scope.index = "index_name";
        this.scope.pagination.warmer_id = "warmer_id";
        this.scope.client.getIndexWarmers = function(){};
        spyOn(this.scope.client, "getIndexWarmers").andReturn(true);
        this.scope.warmer = new Warmer('', 'index_name', {});
        this.scope.loadIndexWarmers();
        expect(this.scope.client.getIndexWarmers).toHaveBeenCalledWith("index_name", 'warmer_id', jasmine.any(Function), jasmine.any(Function));
    });

    // TODO: how to make this work with the call that happens once user confirms?
    it('Deletes an existing Warmup query', function() {
        this.scope.index = { 'name': "index_name" };
        this.scope.client.deleteWarmupQuery = function(){};
        this.scope.updateModel = function(){};
        spyOn(this.scope.client, "deleteWarmupQuery").andReturn(true);
        spyOn(this.ConfirmDialogService, "open").andReturn(true);
        this.scope.deleteWarmupQuery(new Warmer("warmer_id","index", { types: [], source: {}}));
        expect(this.ConfirmDialogService.open).toHaveBeenCalledWith("are you sure you want to delete query warmer_id?", {},"Delete",jasmine.any(Function));
    });

});