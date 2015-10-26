kopf.controller('RestController', ['$scope', '$location', '$timeout',
  'AlertService', 'AceEditorService', 'ElasticService', 'ClipboardService',
  function($scope, $location, $timeout, AlertService, AceEditorService,
           ElasticService, ClipboardService) {

    $scope.request = new Request('/_search', 'GET', '{}');

    $scope.validation_error = null;

    $scope.history = [];

    $scope.editor = null;

    $scope.copyAsCURLCommand = function() {
      var method = $scope.request.method;
      var host = ElasticService.getHost();
      var path = $scope.request.path;
      var body = $scope.editor.getValue();
      var curl = 'curl -X' + method + ' \'' + host + path + '\'';
      if (['POST', 'PUT'].indexOf(method) >= 0) {
        curl += ' -d \'' + body + '\'';
      }
      ClipboardService.copy(
          curl,
          function() {
            AlertService.info('cURL request successfully copied to clipboard');
          },
          function() {
            AlertService.error('Error while copying request to clipboard');
          }
      );
    };

    $scope.loadHistory = function() {
      var history = [];
      var rawHistory = localStorage.getItem('kopf_request_history');
      if (isDefined(rawHistory)) {
        try {
          JSON.parse(rawHistory).forEach(function(h) {
            history.push(new Request().loadFromJSON(h));
          });
        } catch (error) {
          localStorage.setItem('kopf_request_history', null);
        }
      }
      return history;
    };

    $scope.loadFromHistory = function(request) {
      $scope.request.path = request.path;
      $scope.request.body = request.body;
      $scope.request.method = request.method;
      $scope.editor.setValue(request.body);
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
        var historyRaw = JSON.stringify($scope.history);
        localStorage.setItem('kopf_request_history', historyRaw);
      }
    };

    $scope.sendRequest = function() {
      if (notEmpty($scope.request.path)) {
        $scope.request.body = $scope.editor.format();
        $('#rest-client-response').html('');
        if ($scope.request.method == 'GET' && '{}' !== $scope.request.body) {
          AlertService.info('You are executing a GET request with body ' +
              'content. Maybe you meant to use POST or PUT?');
        }
        ElasticService.clusterRequest($scope.request.method,
            $scope.request.path, {}, $scope.request.body,
            function(response) {
              var content = response;
              try {
                content = JSONTree.create(response);
              } catch (error) {
                // nothing to do
              }
              $('#rest-client-response').html(content);
              $scope.addToHistory(new Request($scope.request.path,
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
                var url = ElasticService.connection.host + $scope.request.path;
                AlertService.error(url + ' is unreachable');
              }
            }
        );
      } else {
        AlertService.warn('Path is empty');
      }
    };

    $scope.initEditor = function() {
      if (!isDefined($scope.editor)) {
        $scope.editor = AceEditorService.init('rest-client-editor');
        $scope.editor.setValue($scope.request.body);
      }
    };

    $scope.initializeController = function() {
      $scope.initEditor();
      $scope.history = $scope.loadHistory();
    };

  }

]);
