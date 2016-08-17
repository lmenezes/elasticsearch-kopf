kopf.controller('SnapshotController', ['$scope', 'ConfirmDialogService',
  'AlertService', 'ElasticService',
  function($scope, ConfirmDialogService, AlertService, ElasticService) {
    // registered snapshot
    $scope.showSpecialIndices = false;
    $scope.repositories = [];
    $scope.indices = [];

    $scope.paginator = new Paginator(1, 10, [], new SnapshotFilter());
    $scope.page = $scope.paginator.getPage();
    $scope.snapshots = [];

    $scope.snapshot = null;
    $scope.snapshot_repository = '';

    $scope.restorable_indices = [];
    $scope.repository_form = new Repository('', {settings: {}, type: ''});
    $scope.new_snap = {};
    $scope.restore_snap = {};
    $scope.editor = undefined;

    $scope.$watch('showSpecialIndices', function(current, previous) {
      $scope.loadIndices();
    });

    $scope.$watch(
        function() {
          return ElasticService.cluster;
        },
        function(filter, previous) {
          $scope.loadIndices();
        },
        true
    );

    $scope.loadIndices = function() {
      var indices = $scope.indices = ElasticService.getIndices();
      if (!$scope.showSpecialIndices) {
        indices = indices.filter(function(idx) { return !idx.special; });
      }
      $scope.indices = indices;
    };

    $scope.$watch('paginator', function(filter, previous) {
      $scope.page = $scope.paginator.getPage();
    }, true);

    $scope.reload = function() {
      $scope.loadIndices();
      $scope.loadRepositories();
      if (notEmpty($scope.snapshot_repository)) {
        $scope.fetchSnapshots($scope.snapshot_repository);
      }
    };

    $scope.optionalParam = function(body, object, paramname) {
      if (angular.isDefined(object[paramname])) {
        body[paramname] = object[paramname];
      }
      return body;
    };

    $scope.executeDeleteRepository = function(repository) {
      ElasticService.deleteRepository(repository.name,
          function(response) {
            AlertService.success('Repository successfully deleted', response);
            if (notEmpty($scope.snapshot_repository) &&
                $scope.snapshot_repository == repository.name) {
              $scope.snapshot_repository = '';
            }
            $scope.reload();
          },
          function(error) {
            AlertService.error('Error while deleting repository', error);
          }
      );
    };

    $scope.deleteRepository = function(repository) {
      ConfirmDialogService.open('are you sure you want to delete repository ' +
              repository.name + '?',
          repository.settings,
          'Delete',
          function() {
            $scope.executeDeleteRepository(repository);
          }
      );
    };

    $scope.restoreSnapshot = function() {
      var body = {};
      // dont add to body if not present, these are optional, all indices included by default
      if (angular.isDefined($scope.restore_snap.indices) &&
          $scope.restore_snap.indices.length > 0) {
        body.indices = $scope.restore_snap.indices.join(',');
      }

      $scope.optionalParam(body, $scope.restore_snap, 'include_global_state');
      $scope.optionalParam(body, $scope.restore_snap, 'include_aliases');
      $scope.optionalParam(body, $scope.restore_snap, 'ignore_unavailable');
      $scope.optionalParam(body, $scope.restore_snap, 'rename_replacement');
      $scope.optionalParam(body, $scope.restore_snap, 'rename_pattern');

      ElasticService.restoreSnapshot($scope.snapshot_repository,
          $scope.snapshot.name, JSON.stringify(body),
          function(response) {
            AlertService.success('Snapshot Restored Started');
            $scope.reload();
          },
          function(error) {
            AlertService.error('Error while starting restore of snapshot',
                error);
          }
      );
    };

    $scope.createRepository = function() {
      try {
        $scope.repository_form.validate();
        ElasticService.createRepository($scope.repository_form.name,
            $scope.repository_form.asJson(),
            function(response) {
              AlertService.success('Repository created');
              $scope.loadRepositories();
            },
            function(error) {
              AlertService.error('Error while creating repository', error);
            }
        );
      } catch (error) {
        AlertService.error(error);
      }
    };

    $scope.loadRepositories = function() {
      ElasticService.getRepositories(
          function(response) {
            $scope.repositories = response;
          },
          function(error) {
            $scope.repositories = [];
            AlertService.error('Error while reading snapshot', error);
          }
      );
    };

    $scope.createSnapshot = function() {
      var body = {};

      // name and repo required
      if (!isDefined($scope.new_snap.repository)) {
        AlertService.warn('Repository is required');
        return;
      }

      if (!isDefined($scope.new_snap.name)) {
        AlertService.warn('Snapshot name is required');
        return;
      }

      // dont add to body if not present, these are optional, all indices included by default
      if (isDefined($scope.new_snap.indices) &&
          $scope.new_snap.indices.length > 0) {
        body.indices = $scope.new_snap.indices.join(',');
      }

      if (isDefined($scope.new_snap.include_global_state)) {
        body.include_global_state = $scope.new_snap.include_global_state;
      }

      $scope.optionalParam(body, $scope.new_snap, 'ignore_unavailable');

      ElasticService.createSnapshot($scope.new_snap.repository.name,
          $scope.new_snap.name, JSON.stringify(body),
          function(response) {
            AlertService.success('Snapshot created');
            $scope.reload();
          },
          function(error) {
            AlertService.error('Error while creating snapshot', error);
          }
      );
    };

    $scope.deleteSnapshot = function(snapshot) {
      ConfirmDialogService.open(
              'are you sure you want to delete snapshot ' + snapshot.name + '?',
          snapshot,
          'Delete',
          function() {
            ElasticService.deleteSnapshot(
                $scope.snapshot_repository,
                snapshot.name,
                function(response) {
                  AlertService.success('Snapshot successfully deleted',
                      response);
                  $scope.reload();
                },
                function(error) {
                  AlertService.error('Error while deleting snapshot', error);
                }
            );
          }
      );
    };

    $scope.fetchSnapshots = function(repository) {
      ElasticService.getSnapshots(repository,
          function(response) {
            $scope.paginator.setCollection(response);
            $scope.page = $scope.paginator.getPage();
          },
          function(error) {
            $scope.paginator.setCollection([]);
            $scope.page = $scope.paginator.getPage();
            AlertService.error('Error while fetching snapshots', error);
          }
      );
    };

    $scope.selectSnapshot = function(snapshot) {
      $scope.snapshot = snapshot;
    };

    $scope.unselectSnapshot = function() {
      $scope.snapshot = null;
    };

    $scope.selectRepository = function(repository) {
      $scope.snapshot_repository = repository;
      $scope.fetchSnapshots(repository);
    };

    $scope.initializeController = function() {
      $scope.snapshot = null; // clear 'active' snapshot
      $scope.reload();
    };

  }
]);
