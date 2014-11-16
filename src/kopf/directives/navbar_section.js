kopf.directive('ngNavbarSection', ['$location', function($location) {

  return {
    template: function(elem, attrs) {
      var name = attrs.name;
      var icon = attrs.icon;
      var active = name === $location.path().substring(1);
      var clazz = active ? ' active' : '';
      attrs.class = attrs.class + clazz;
      return '<a href="#!' + name + '">' +
          '<i class="fa fa-fw ' + icon + '"></i> ' + name +
          '</a>';
    }
  };
}]);
