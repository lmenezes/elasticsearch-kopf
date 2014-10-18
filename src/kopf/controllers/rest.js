kopf.controller('RestController', ['$scope', '$location', '$timeout',
  'AlertService', 'AceEditorService', 'ElasticService',
  function($scope, $location, $timeout, AlertService, AceEditorService,
           ElasticService) {

    $scope.request = new Request(ElasticService.getHost() + '/_search', 'GET',
        '{}');
    $scope.validation_error = null;

    $scope.loadHistory = function() {
      var history = [];
      if (isDefined(localStorage.kopf_request_history)) {
        try {
          JSON.parse(localStorage.kopf_request_history).forEach(function(h) {
            history.push(new Request().loadFromJSON(h));
          });
        } catch (error) {
          localStorage.kopf_request_history = null;
        }
      }
      return history;
    };

    $scope.history = $scope.loadHistory();
    $scope.history_request = null;

    if (!angular.isDefined($scope.editor)) {
      $scope.editor = AceEditorService.init('rest-client-editor');
    }

    $scope.editor.setValue($scope.request.body);

    $scope.loadFromHistory = function(request) {
      $scope.request.url = request.url;
      $scope.request.body = request.body;
      $scope.request.method = request.method;
      $scope.editor.setValue(request.body);
      $scope.history_request = null;
    };

    $scope.addToHistory = function(request) {
      var exists = false;
      for (var i = 0; i < $scope.history.length; i++) {
        if ($scope.history[i].equals(request)) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        $scope.history.unshift(request);
        if ($scope.history.length > 30) {
          $scope.history.length = 30;
        }
        localStorage.kopf_request_history = JSON.stringify($scope.history);
      }
    };

    $scope.sendRequest = function() {
      $scope.request.body = $scope.editor.format();
      $('#rest-client-response').html('');
      if (notEmpty($scope.request.url)) {
        var a = document.createElement('a');
        a.href = $scope.request.url;
        var username = a.username || null;
        var password = a.password || null;
        if ($scope.request.method == 'GET' && '{}' !== $scope.request.body) {
          AlertService.info('You are executing a GET request with body ' +
              'content. Maybe you meant to use POST or PUT?');
        }
        ElasticService.client.executeRequest($scope.request.method,
            $scope.request.url, username, password, $scope.request.body,
            function(response) {
              var content = response;
              try {
                content = JSONTree.create(response);
              } catch (error) {
                // nothing to do
              }
              $('#rest-client-response').html(content);
              $scope.addToHistory(new Request($scope.request.url,
                  $scope.request.method, $scope.request.body));
            },
            function(error, status) {
              if (status !== 0) {
                AlertService.error('Request was not successful');
                try {
                  $('#rest-client-response').html(JSONTree.create(error));
                } catch (invalidJsonError) {
                  $('#rest-client-response').html(error);
                }
              } else {
                AlertService.error($scope.request.url + ' is unreachable');
              }
            }
        );
      }
    };
  }
]);
