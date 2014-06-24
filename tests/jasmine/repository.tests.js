'use strict';

describe('RepositoryController', function(){
    var scope, createController, _q, _rootScope;

    beforeEach(angular.mock.module('kopf'));
    
    beforeEach(angular.mock.inject(function($rootScope, $controller, $injector){
        //create an empty scope
        this.scope = $rootScope.$new();
        this.scope.client = {}         //set fake client
        var $q = $injector.get('$q');
        this._q = $q
        this._rootScope = $rootScope;
        var $timeout = $injector.get('$timeout');
        var $location = $injector.get('$location');
        this.ConfirmDialogService = $injector.get('ConfirmDialogService');
        var AlertService = $injector.get('AlertService');
        this.AlertService = AlertService;
        var AceEditorService = $injector.get('AceEditorService');
        this.AceEditorService = AceEditorService;
        this.scope.updateModel=function(body) { body(); };

        this.createController = function() {
            return $controller('RepositoryController', {$scope: this.scope}, $location, $timeout, this.ConfirmDialogService, AlertService, AceEditorService);
        };

        this._controller = this.createController();
    }));

    //TESTS
    it('init : values are set', function(){
        expect(this.scope.repositories).toEqual([]);
        expect(this.scope.snapshots).toEqual([]);
        expect(this.scope.indices).toEqual([]);
        expect(this.scope.snapshot).toEqual(null)
        expect(this.scope.snapshot_repository).toEqual('');;
        expect(this.scope.restorable_indices).toEqual([]);
        expect(this.scope.new_repo).toEqual({});
        expect(this.scope.new_snap).toEqual({});
        expect(this.scope.restore_snap).toEqual({});
        expect(this.scope.editor).toEqual(undefined);
    });

    it('on : makes calls reload, initEditor and sets snapshot to null', function() {
        spyOn(this.scope, 'reload').andReturn(true);
        spyOn(this.scope, 'initEditor').andCallThrough();
        spyOn(this.AceEditorService, 'init').andReturn("fakeaceeditor");
        this.scope.snapshot = "not_null";
        this.scope.$emit("loadRepositoryEvent");
        expect(this.scope.reload).toHaveBeenCalled();
        expect(this.scope.initEditor).toHaveBeenCalled();
        expect(this.AceEditorService.init).toHaveBeenCalledWith('repository-settings-editor');
        expect(this.scope.editor).toEqual("fakeaceeditor");
        expect(this.scope.snapshot).toEqual(null);
    });

    it('loadIndices : assigns a value to indices from cluster.indices', function() {
        this.scope.cluster = {};
        this.scope.cluster.indices = ["chicken", "kale", "potatoes"];
        this.scope.loadIndices();
        expect(this.scope.indices).toEqual(["chicken", "kale", "potatoes"]);
    });

    it('reload : calls loadRepositories and loadIndices if not snapshot_repository', function() {
        spyOn(this.scope, 'loadRepositories').andReturn(true);
        spyOn(this.scope, 'fetchSnapshots').andReturn(true);
        spyOn(this.scope, 'loadIndices').andReturn(true);
        this.scope.reload();
        this._rootScope.$apply();  //force cycle so promise gets resolved
        expect(this.scope.loadRepositories).toHaveBeenCalled();
        expect(this.scope.fetchSnapshots).not.toHaveBeenCalled();
        expect(this.scope.loadIndices).toHaveBeenCalled();
    });

    it('reload : calls loadRepositories and loadIndices', function() {
        spyOn(this.scope, 'loadRepositories').andReturn(true);
        spyOn(this.scope, 'fetchSnapshots').andReturn(true);
        spyOn(this.scope, 'loadIndices').andReturn(true);
        this.scope.snapshot_repository = 'whatever';
        this.scope.reload();
        this._rootScope.$apply();  //force cycle so promise gets resolved
        expect(this.scope.loadRepositories).toHaveBeenCalled();
        expect(this.scope.fetchSnapshots).toHaveBeenCalled();
        expect(this.scope.loadIndices).toHaveBeenCalled();
    });

    it('optionalParam : sets param on body', function() {
        var answer = this.scope.optionalParam({"chicken":"no"}, {"chicken":"yes"}, "chicken");
        expect(answer).toEqual({"chicken":"yes"});

        answer = this.scope.optionalParam({"chicken":"no"}, {"chicken":"yes"}, "pork");
        expect(answer).toEqual({"chicken":"no"});

        answer = this.scope.optionalParam({"chicken":"no"}, {}, "pork");
        expect(answer).toEqual({"chicken":"no"});
    });

    it('deleteRepository : calls dialog_service open', function() {
        spyOn(this.ConfirmDialogService, "open").andReturn(true);
        this.scope.deleteRepository("name", "value");
        expect(this.ConfirmDialogService.open).toHaveBeenCalled();
    });

    it('restoreSnapshot : calls client.restorSnapshot : missing optionals', function () {
        this.scope.client.restoreSnapshot = function(){};
        this.scope.snapshot_repository = 'my_repo';
        this.scope.snapshot = { "name":"my_snap" };
        this.scope.restore_snap = {
                                    "snapshot": {
                                                "snapshot":"my_snap",
                                                "repository":"my_repo"
                                                }
                                  };
        var expected = {};
        spyOn(this.scope.client, "restoreSnapshot").andReturn(true);

        this.scope.restoreSnapshot();
        expect(this.scope.client.restoreSnapshot).toHaveBeenCalledWith("my_repo",
                                                                       "my_snap",
                                                                       JSON.stringify(expected),
                                                                       jasmine.any(Function),
                                                                       jasmine.any(Function));
    });

    it('restoreSnapshot : calls client.restorSnapshot : all params', function () {
        this.scope.client.restoreSnapshot = function(repo, name, body, success, failure){ success(); };
        this.scope.snapshot_repository = 'my_repo';
        this.scope.snapshot = { "name":"my_snap" };
        this.scope.restore_snap = {
                                    "indices":["idx-20140107","idx-20140108"],
                                    "ignore_unavailable": false,
                                    "include_global_state":false,
                                    "rename_replacement": "-chicken-",
                                    "rename_pattern":"-",
                                    "snapshot": { "snapshot":"my_snap", "repository":"my_repo" }
                                  };

        var expected = {
                        "indices":"idx-20140107,idx-20140108",
                        "include_global_state":false,
                        "ignore_unavailable":false,
                        "rename_replacement":"-chicken-",
                        "rename_pattern":"-"
                        };
        spyOn(this.scope.client, "restoreSnapshot").andCallThrough(true);
        spyOn(this.scope, "reload").andReturn(true);
        spyOn(this.AlertService, "success").andReturn(true);
        this.scope.restoreSnapshot();
        expect(this.scope.client.restoreSnapshot).toHaveBeenCalledWith("my_repo",
                                                                       "my_snap",
                                                                       JSON.stringify(expected),
                                                                       jasmine.any(Function),
                                                                       jasmine.any(Function));
        expect(this.scope.reload).toHaveBeenCalled();
        expect(this.AlertService.success).toHaveBeenCalled();
    });

    it('restoreSnapshot : calls client.restorSnapshot fails', function () {
        this.scope.client.restoreSnapshot = function(repo, name, body, success, failure){ failure(); };
        this.scope.snapshot_repository = 'my_repo';
        this.scope.snapshot = { "name":"my_snap" };
        this.scope.restore_snap = {
                                    "indices":["idx-20140107","idx-20140108"],
                                    "ignore_unavailable": false,
                                    "include_global_state":false,
                                    "rename_replacement": "-chicken-",
                                    "rename_pattern":"-",
                                    "snapshot": { "snapshot":"my_snap", "repository":"my_repo" }
                                  };

        var expected = {
                        "indices":"idx-20140107,idx-20140108",
                        "include_global_state":false,
                        "ignore_unavailable":false,
                        "rename_replacement":"-chicken-",
                        "rename_pattern":"-"
                        };
        spyOn(this.scope.client, "restoreSnapshot").andCallThrough(true);
        spyOn(this.AlertService, "error").andReturn(true);
        this.scope.restoreSnapshot();
        expect(this.scope.client.restoreSnapshot).toHaveBeenCalledWith("my_repo",
                                                                       "my_snap",
                                                                       JSON.stringify(expected),
                                                                       jasmine.any(Function),
                                                                       jasmine.any(Function));
        expect(this.AlertService.error).toHaveBeenCalled();
    });

    it('createRepository : if success calls client.createRepository and reload repositories', function(){
        this.scope.client.createRepository = function(name, body, success, failure){ success(); };
        spyOn(this.scope.client, "createRepository").andCallThrough();
        spyOn(this.scope, "loadRepositories").andReturn(true);
        spyOn(this.AlertService, "success");
        this.scope.new_repo = { name:"my_repo", type:"o positive" };
        this.scope.editor = {
                            error: null,
                            format:function(){return "{\"settings_key\":\"settings_value\"}";}
                            };
        var expected = {type: "o positive", settings: {"settings_key":"settings_value"}};
        this.scope.createRepository();
        expect(this.scope.client.createRepository).toHaveBeenCalledWith("my_repo",
                                                                        JSON.stringify(expected),
                                                                        jasmine.any(Function),
                                                                        jasmine.any(Function));
        expect(this.scope.loadRepositories).toHaveBeenCalled();
        expect(this.AlertService.success).toHaveBeenCalled();

    });

    it('createRepository : if fails calls client.createRepository and reload repositories', function(){
        this.scope.client.createRepository = function(name, body, success, failure){ failure(); };
        spyOn(this.scope.client, "createRepository").andCallThrough();
        spyOn(this.AlertService, "error");
        this.scope.new_repo = { name:"my_repo", type:"o positive" };
        this.scope.editor = {
                            error: null,
                            format:function(){return "{\"settings_key\":\"settings_value\"}";}
                            };
        var expected = {type: "o positive", settings: {"settings_key":"settings_value"}};
        this.scope.createRepository();
        expect(this.scope.client.createRepository).toHaveBeenCalledWith("my_repo",
                                                                        JSON.stringify(expected),
                                                                        jasmine.any(Function),
                                                                        jasmine.any(Function));
        expect(this.AlertService.error).toHaveBeenCalled();
    });

    it('createRepository : does NOT call client.createRepository if editor error', function(){
        this.scope.client.createRepository = function(){};
        spyOn(this.scope.client, "createRepository").andReturn(true);
        this.scope.editor = {
                            error: "yep this is an error",
                            format:function(){return "{\"settings_key\":\"settings_value\"}";}
                            };
        this.scope.createRepository();
        expect(this.scope.client.createRepository).not.toHaveBeenCalled();
    });

    it('loadRepositories : if success calls client.getRepositories and sets repositories', function() {
        var repos = [ new Repository('a', { 'type': 'test', 'settings': {} } ) ];
        this.scope.client.getRepositories = function(success, failure) { 
          success(repos); 
        };
        
        this.scope.loadRepositories();
        expect(this.scope.repositories).toEqual(repos);
    });

    it('loadRepositories : if fails calls Alert service and sets repositories to ][]', function() {
        this.scope.client.getRepositories = function(success, failure) { 
          failure("error message"); 
        };
        spyOn(this.AlertService, "error");
        this.scope.loadRepositories();
        expect(this.scope.repositories).toEqual([]);
        expect(this.AlertService.error).toHaveBeenCalled();
    });

    it('createSnapshot : repository is required', function() {
        this.scope.client.createSnapshot = function(){};
        spyOn(this.AlertService, "warn");
        this.scope.new_snap = {};

        this.scope.createSnapshot();
        expect(this.AlertService.warn).toHaveBeenCalledWith("Repository is required");
    });

    it('createSnapshot : snapshot name is required', function() {
        this.scope.client.createSnapshot = function(){};
        spyOn(this.AlertService, "warn");
        this.scope.new_snap = {"repository":"yep"};

        this.scope.createSnapshot();
        expect(this.AlertService.warn).toHaveBeenCalledWith("Snapshot name is required");
    });

    it('createSnapshot : calls client.createSnapshot', function() {
        this.scope.client.createSnapshot = function(){};
        spyOn(this.scope.client, "createSnapshot").andReturn(true);
        this.scope.new_snap = {"repository": new Repository("my_repo", {}),
                                "name":"my_snap"
                            };

        this.scope.createSnapshot();
        expect(this.scope.client.createSnapshot).toHaveBeenCalledWith("my_repo",
                                                                        "my_snap",
                                                                        JSON.stringify({}),
                                                                        jasmine.any(Function),
                                                                        jasmine.any(Function));
    });

    it('createSnapshot : calls client.createSnapshot - sets optional', function() {
        this.scope.client.createSnapshot = function(){};
        spyOn(this.scope.client, "createSnapshot").andReturn(true);
        this.scope.new_snap = {"repository": new Repository("my_repo", {}),
                                "name":"my_snap",
                                "indices":["one","two"],
                                "include_global_state":true,
                                "ignore_unavailable":true
                            };

        var expected = {
                        "indices":"one,two",
                        "include_global_state":true,
                        "ignore_unavailable":true
                        };

        this.scope.createSnapshot();
        expect(this.scope.client.createSnapshot).toHaveBeenCalledWith("my_repo",
                                                                        "my_snap",
                                                                        JSON.stringify(expected),
                                                                        jasmine.any(Function),
                                                                        jasmine.any(Function));
    });

    it('deleteSnapshot : calls dialog_service open', function() {
        spyOn(this.ConfirmDialogService, "open").andReturn(true);
        this.scope.deleteSnapshot("name", "value");
        expect(this.ConfirmDialogService.open).toHaveBeenCalled();
    });

    it('fetchSnapshots : calls getSnapshots', function() {
        this.scope.client.getSnapshots = function(){};
        spyOn(this.scope.client, "getSnapshots").andReturn(true);
        this.scope.fetchSnapshots("chicken");
        expect(this.scope.client.getSnapshots).toHaveBeenCalledWith(
            "chicken",
            jasmine.any(Function),
            jasmine.any(Function));
    });

    it('fetchSnapshots : when successful sets snapshots to fetched values', function() {
        var snapshots = [ new Snapshot({ "name":"fetched_snapshot"}) ];
        this.scope.client.getSnapshots = function(repo, success, failed){ success(snapshots); };
        this.scope.fetchSnapshots("chicken");
        expect(this.scope.pagination.getPage()).toEqual(snapshots);
    });

    it('fetchSnapshots : when failed sets snapshots to [] and calls alert service', function() {
        this.scope.client.getSnapshots = function(repo, success, failed){ failed("failed"); };
        spyOn(this.AlertService, "error").andReturn(true);
        this.scope.fetchSnapshots("chicken");
        expect(this.AlertService.error).toHaveBeenCalled();
        expect(this.scope.snapshots).toEqual([]);
    });

    it('selectRepository should set given repository and fetch snapshots for it', function() {
        spyOn(this.scope, "fetchSnapshots").andReturn(true);
        this.scope.selectRepository("repo_name");
        expect(this.scope.snapshot_repository).toEqual("repo_name");
        expect(this.scope.fetchSnapshots).toHaveBeenCalledWith("repo_name");
    });

    it('selectSnapshot should set snapshot to given value', function() {
        this.scope.selectSnapshot("new_snapshot");
        expect(this.scope.snapshot).toEqual("new_snapshot");
    });

    it('unselectSnapshot should set given selected snapshot to null', function() {
        this.scope.snapshot = "set_snapshot";
        this.scope.unselectSnapshot();
        expect(this.scope.snapshot).toEqual(null);
    });


});