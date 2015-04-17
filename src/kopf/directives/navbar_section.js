kopf.directive('ngNavbarSection', ['$location', 'ElasticService',
  function($location, ElasticService) {

    return {
      template: function(elem, attrs) {
        var visible = ElasticService.versionCheck(attrs.version);
        if (visible) {
          var name = attrs.name;
          var icon = attrs.icon;
          return '<a href="#!' + name + '">' +
              '<i class="fa fa-fw ' + icon + '"></i> ' + name +
              '</a>';
        } else {
          return '';
        }
      }
    };
  }

]);
