kopf.controller('GlobalController', ['$scope', '$location', '$sce', '$window',
  'AlertService', 'ElasticService', 'ExternalSettingsService',
  function($scope, $location, $sce, $window, AlertService, ElasticService,
           ExternalSettingsService) {

    $scope.version = '1.4.6';

    $scope.modal = new ModalControls();

    $scope.getTheme = function() {
      return ExternalSettingsService.getTheme();
    };

    $scope.readParameter = function(name) {
      var regExp = new RegExp('[\\?&]' + name + '=([^&#]*)');
      var results = regExp.exec($window.location.href);
      return isDefined(results) ? results[1] : null;
    };

    $scope.connect = function() {
      try {
        var host = ExternalSettingsService.getDefaultHost(); // default from config if not set in this block
        if ($location.host() !== '') { // not opening from fs
          var location = $scope.readParameter('location');
          var url = $location.absUrl();
          if (isDefined(location)) {
            host = location;
          } else if (url.indexOf('/_plugin/kopf') > -1) {
            host = url.substring(0, url.indexOf('/_plugin/kopf'));
          } else if (!host){
            host = $location.protocol() + '://' + $location.host() +
                ':' + $location.port();
          }
        }
        ElasticService.connect(host);
      } catch (error) {
        AlertService.error(error.message, error.body);
      }
    };

    $scope.connect();

    ElasticService.refresh();

    $scope.hasConnection = function() {
      return isDefined(ElasticService.cluster);
    };

    $scope.displayInfo = function(title, info) {
      $scope.modal.title = title;
      $scope.modal.info = $sce.trustAsHtml(JSONTree.create(info));
      $('#modal_info').modal({show: true, backdrop: true});
    };

  }
]);
