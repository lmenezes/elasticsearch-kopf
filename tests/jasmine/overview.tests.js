'use strict';

describe('ClusterOverviewController', function(){
    var scope, createController;

    beforeEach(angular.mock.module('kopf'));

    beforeEach(angular.mock.inject(function($rootScope, $controller, $injector){
        this.scope = $rootScope.$new();
        this.scope.client = {};
        this.AlertService = $injector.get('AlertService');
        this.IndexSettingsService = $injector.get('IndexSettingsService');
        this.ConfirmDialogService = $injector.get('ConfirmDialogService');
        this.createController = function() {
            return $controller('ClusterOverviewController', {$scope: this.scope}, this.IndexSettingsService, this.ConfirmDialogService, this.AlertService);
        };

        this._controller = this.createController();
    }));

    //TESTS
    it('has an empty paginator with page size 5 and empty index and node filters when initialized', function(){
        // paginator
        expect(this.scope.index_paginator.getCollection()).toEqual([]);
        expect(this.scope.index_paginator.page).toEqual(1);
        expect(this.scope.index_paginator.page_size).toEqual(5);
        expect(this.scope.index_paginator.filter.name).toEqual("");
        expect(this.scope.index_paginator.filter.state).toEqual("");
        expect(this.scope.index_paginator.filter.hide_special).toEqual(true);
        expect(this.scope.index_paginator.filter.timestamp).toEqual(0);
        // page
        expect(this.scope.page.elements.length).toEqual(5);
        expect(this.scope.page.first).toEqual(0);
        expect(this.scope.page.last).toEqual(0);
        expect(this.scope.page.next).toEqual(false);
        expect(this.scope.page.previous).toEqual(false);
        // node filter
        expect(this.scope.node_filter.name).toEqual("");
        expect(this.scope.node_filter.master).toEqual(true);
        expect(this.scope.node_filter.data).toEqual(true);
        expect(this.scope.node_filter.client).toEqual(true);
        // node list
        expect(this.scope.nodes).toEqual([]);
    });

    //TESTS
    it('should detect when cluster changes and update indices and nodes', function(){
        // paginator
        this.scope.cluster = { indices: [ 1, 2, 3 ], nodes: [ 3, 2, 1] };
        spyOn(this.scope, 'setIndices').andReturn(true);
        spyOn(this.scope, 'setNodes').andReturn(true);
        this.scope.$digest();
        expect(this.scope.setIndices).toHaveBeenCalledWith([1,2,3]);
        expect(this.scope.setNodes).toHaveBeenCalledWith([3,2,1]);
    });

    it('should detect when indices filter name changes and update indices', function(){
        // paginator
        this.scope.cluster = { indices: [], nodes: [] };
        this.scope.$digest();
        spyOn(this.scope, 'setIndices').andReturn(true);
        spyOn(this.scope, 'setNodes').andReturn(true);
        this.scope.index_paginator.filter.name = 'b';
        this.scope.$digest();
        expect(this.scope.setIndices).toHaveBeenCalledWith([]);
        expect(this.scope.setNodes).not.toHaveBeenCalled();
    });

    it('should detect when indices filter state changes and update indices', function(){
        // paginator
        this.scope.cluster = { indices: [], nodes: [] };
        this.scope.$digest();
        spyOn(this.scope, 'setIndices').andReturn(true);
        spyOn(this.scope, 'setNodes').andReturn(true);
        this.scope.index_paginator.filter.state = 'b';
        this.scope.$digest();
        expect(this.scope.setIndices).toHaveBeenCalledWith([]);
        expect(this.scope.setNodes).not.toHaveBeenCalled();
    });

    it('should detect when indices filter hide_special changes and update indices', function(){
        // paginator
        this.scope.cluster = { indices: [], nodes: [] };
        this.scope.$digest();
        spyOn(this.scope, 'setIndices').andReturn(true);
        spyOn(this.scope, 'setNodes').andReturn(true);
        this.scope.index_paginator.filter.hide_special = false;
        this.scope.$digest();
        expect(this.scope.setIndices).toHaveBeenCalledWith([]);
        expect(this.scope.setNodes).not.toHaveBeenCalled();
    });

    it('should detect when nodes filter name changes and updates nodes', function(){
        // paginator
        this.scope.cluster = { indices: [], nodes: [] };
        this.scope.$digest();
        spyOn(this.scope, 'setIndices').andReturn(true);
        spyOn(this.scope, 'setNodes').andReturn(true);
        this.scope.node_filter.name= "a";
        this.scope.$digest();
        expect(this.scope.setNodes).toHaveBeenCalledWith([]);
        expect(this.scope.setIndices).not.toHaveBeenCalled();
    });

    it('should detect when nodes filter data node filter changes and updates nodes', function(){
        // paginator
        this.scope.cluster = { indices: [], nodes: [] };
        this.scope.$digest();
        spyOn(this.scope, 'setIndices').andReturn(true);
        spyOn(this.scope, 'setNodes').andReturn(true);
        this.scope.node_filter.data= false;
        this.scope.$digest();
        expect(this.scope.setNodes).toHaveBeenCalledWith([]);
        expect(this.scope.setIndices).not.toHaveBeenCalled();
    });

    it('should detect when nodes filter master node filter changes and updates nodes', function(){
        // paginator
        this.scope.cluster = { indices: [], nodes: [] };
        this.scope.$digest();
        spyOn(this.scope, 'setIndices').andReturn(true);
        spyOn(this.scope, 'setNodes').andReturn(true);
        this.scope.node_filter.master= false;
        this.scope.$digest();
        expect(this.scope.setNodes).toHaveBeenCalledWith([]);
        expect(this.scope.setIndices).not.toHaveBeenCalled();
    });

    it('should detect when nodes filter client node filter changes and updates nodes', function(){
        // paginator
        this.scope.cluster = { indices: [], nodes: [] };
        this.scope.$digest();
        spyOn(this.scope, 'setIndices').andReturn(true);
        spyOn(this.scope, 'setNodes').andReturn(true);
        this.scope.node_filter.client= false;
        this.scope.$digest();
        expect(this.scope.setNodes).toHaveBeenCalledWith([]);
        expect(this.scope.setIndices).not.toHaveBeenCalled();
    });

    it('should correctly set nodes', function(){
        this.scope.setNodes([1,2,3]);
        expect(this.scope.nodes).toEqual([1,2,3]);
    });

    it('should correctly set indices', function(){
        this.scope.index_paginator.filter.hide_special = false;
        this.scope.setIndices([1,2,3]);
        expect(this.scope.page.elements).toEqual([1,2,3, null, null]);
        expect(this.scope.page.first).toEqual(1);
        expect(this.scope.page.last).toEqual(3);
        expect(this.scope.page.next).toEqual(false);
        expect(this.scope.page.previous).toEqual(false);
    });



});