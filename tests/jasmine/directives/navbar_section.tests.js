describe('ngNavbarSection', function() {
  var $compile, $rootScope, $location;

  beforeEach(module('kopf'));

  beforeEach(inject(function(_$compile_, _$rootScope_, _$location_) {
    $compile = _$compile_;
    $rootScope = _$rootScope_;
    $location = _$location_;
    this.scope = $rootScope.$new();
  }));

  it('Creates correct HTML', function() {
    var element = $compile('<li ng-navbar-section name="snapshot" icon="fa-camera"></li>')($rootScope);
    $rootScope.$digest();
    expect(element.html()).toContain('<a href="#!snapshot"><i class="fa fa-fw fa-camera"></i> snapshot</a>');
  });

  it('Creates correct HTML for active element', function() {
    spyOn($location, 'path').andReturn('/snapshot');
    var element = $compile('<li ng-navbar-section name="snapshot" icon="fa-camera"></li>')($rootScope);
    $rootScope.$digest();
    expect($location.path).toHaveBeenCalled();
    expect(element.attr('class')).toEqual('active ng-scope');
  });

  it('Creates correct HTML for non active element', function() {
    spyOn($location, 'path').andReturn('/cluster');
    var element = $compile('<li ng-navbar-section name="snapshot" icon="fa-camera"></li>')($rootScope);
    $rootScope.$digest();
    expect($location.path).toHaveBeenCalled();
    expect(element.attr('class')).toEqual('ng-scope');
  });

  it('removes active class when location has changed', function() {
    $location.path = function() { return '/snapshot'; };
    spyOn($location, 'path').andCallThrough();
    var element = $compile('<li ng-navbar-section name="snapshot" icon="fa-camera"></li>')($rootScope);
    $rootScope.$digest();
    expect($location.path).toHaveBeenCalled();
    expect(element.attr('class')).toEqual('active ng-scope');
    $location.path = function() { return '/cluster'; };
    spyOn($location, 'path').andCallThrough();
    $rootScope.$digest();
    expect($location.path).toHaveBeenCalled();
    expect(element.attr('class')).toEqual('ng-scope');
  });

  it('adds active class when location has changed', function() {
    $location.path = function() { return '/cluster'; };
    spyOn($location, 'path').andCallThrough();
    var element = $compile('<li ng-navbar-section name="snapshot" icon="fa-camera"></li>')($rootScope);
    $rootScope.$digest();
    expect($location.path).toHaveBeenCalled();
    expect(element.attr('class')).toEqual('ng-scope');
    $location.path = function() { return '/snapshot'; };
    spyOn($location, 'path').andCallThrough();
    $rootScope.$digest();
    expect($location.path).toHaveBeenCalled();
    expect(element.attr('class')).toEqual('ng-scope active');
  });

});