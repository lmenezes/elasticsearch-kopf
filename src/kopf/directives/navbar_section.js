kopf.directive('ngNavbarSection', ['$location', 'ElasticService',
  function($location, ElasticService) {

    function link(scope, elem, attrs) {
      scope.$watch(
          function() {
            return $location.path();
          },
          function() {
            var name = attrs.name;
            var active = name === $location.path().substring(1);
            if (active) {
              elem.addClass('active');
            } else {
              elem.removeClass('active');
            }
          }
      );
    }

    return {
      link: link,
      template: function(elem, attrs) {
        var visible = ElasticService.versionCheck(attrs.version);
        if (visible) {
          var name = attrs.name;
          var icon = attrs.icon;
          var active = name === $location.path().substring(1);
          if (active) {
            elem.addClass('active');
          }
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
