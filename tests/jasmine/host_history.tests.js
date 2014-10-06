"use strict";

describe("Host history service", function () {
    var service;

    beforeEach(angular.mock.module('kopf'));

    beforeEach(angular.mock.inject(function ($rootScope, $injector) {
        service = $injector.get('HostHistoryService');
        service.clearHistory();
    }));

    it("Successfully adds a new element to history", function () {
        var history = service.getHostHistory();
        expect(history).toEqual([]);
        service.addToHistory("http://localhost");
        history = service.getHostHistory();
        expect(history).toEqual([{ host : 'http://localhost' }]);
    });

    it("Only adds an element once", function () {
        var history = service.getHostHistory();
        expect(history).toEqual([]);
        service.addToHistory("http://localhost");
        history = service.getHostHistory();
        expect(history).toEqual([{ host : 'http://localhost' }]);
        service.addToHistory("http://localhost");
        history = service.getHostHistory();
        expect(history).toEqual([{ host : 'http://localhost' }]);
    });

    it("should move an alredy present entry to the top when added again", function () {
        var history = service.getHostHistory();
        expect(history).toEqual([]);
        service.addToHistory("http://localhost1");
        history = service.getHostHistory();
        expect(history).toEqual([{ host : 'http://localhost1' }]);
        service.addToHistory("http://localhost2");
        history = service.getHostHistory();
        expect(history).toEqual([{ host : 'http://localhost2' }, { host : 'http://localhost1' }]);
        service.addToHistory("http://localhost1");
        history = service.getHostHistory();
        expect(history).toEqual([{ host : 'http://localhost1' }, { host : 'http://localhost2' }]);
    });

    it("should limit history to 10 elements", function () {
        var history = service.getHostHistory();
        expect(history).toEqual([]);
        service.addToHistory("http://localhost1");
        service.addToHistory("http://localhost2");
        service.addToHistory("http://localhost3");
        service.addToHistory("http://localhost4");
        service.addToHistory("http://localhost5");
        service.addToHistory("http://localhost6");
        service.addToHistory("http://localhost7");
        service.addToHistory("http://localhost8");
        service.addToHistory("http://localhost9");
        service.addToHistory("http://localhost10");
        service.addToHistory("http://localhost11");
        history = service.getHostHistory();
        expect(history.length).toEqual(10);
    });

});