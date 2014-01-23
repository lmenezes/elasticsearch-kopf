function RepositoryController($q, $scope, $location, $timeout, ConfirmDialogService, AlertService) {

	$scope.alert_service = AlertService;
	$scope.dialog_service = ConfirmDialogService;
	
	$scope.editor = new AceEditor('repository-settings-editor');

	$scope.repositories = [];
	$scope.repositories_names = [];
	$scope.snapshots = [];
	$scope.indices = [];
	$scope.new_repo = {};
	$scope.new_snap = {};

    $scope.$on('loadRepositoryEvent', function() {
		$scope.reload();
    });
	
	$scope.loadIndices=function() {
		$scope.indices = $scope.cluster.indices;
	};

    $scope.reload=function(){
		$scope.loadRepositories().then(
							function() {
								$scope.allSnapshots($scope.repositories)
							});
		$scope.loadIndices();
    };

	$scope.deleteRepository=function(name, value){
		$scope.dialog_service.open(
			"are you sure you want to delete repository " + name + "?",
			value,
			"Delete",
			function() {
				$scope.client.deleteRepository(name,
					function(response) {
						$scope.alert_service.success("Repository successfully deleted", response);
						$scope.reload();
					},
					function(error) {
						$scope.updateModel(function() {
							$scope.alert_service.error("Error while deleting repositor", error);
						});
					}
				);
			}
		);
	};

	$scope.createRepository=function(){
		$scope.new_repo.settings = $scope.editor.format();
		if ($scope.editor.error === null){
			var body = {
				type: $scope.new_repo.type,
				settings: JSON.parse($scope.new_repo.settings)
			}

			$scope.client.createRepository($scope.new_repo.name, JSON.stringify(body),
				function(response) {
					$scope.alert_service.success("Repository created");
					$scope.loadRepositories();
				},
				function(error) {
					$scope.updateModel(function() {
						$scope.alert_service.error("Error while creating repository", error);
					});
				}
			);
		}
	};

	$scope.loadRepositories=function() {
		var deferred = $q.defer();
		try {
			$scope.client.getRepositories(
				function(response) {
					$scope.updateModel(function() {
						$scope.repositories = response;
						$.each($scope.repositories, function(key, value){
							$scope.repositories_names.push({"name":key, "value":key});
						});
					});
					deferred.resolve(true);
				},
				function(error) {
					if (!(error['responseJSON'] != null )) {
						$scope.updateModel(function() {
							$scope.alert_service.error("Error while reading repositories", error);
						});
					}
					deferred.reject(true);
				}
			)
		} catch (error) {
			$scope.alert_service.error("Failed to load repositories");
			deferred.reject(false);
		}
		return deferred.promise
	};

	$scope.createSnapshot=function(){
		var body = {}

		// name and repo required
		if(!angular.isDefined($scope.new_snap.repository))
		{
			$scope.alert_service.warn("Repository is required");
			return
		}

		if(!angular.isDefined($scope.new_snap.name))
		{
			$scope.alert_service.warn("Snapshot name is required");
			return
		}

		// dont add to body if not present, these are optional, all indices included by default
		if(angular.isDefined($scope.new_snap.indices) && $scope.new_snap.indices.length > 0)
		{
			body["indices"] = $scope.new_snap.indices.join(",");
		}

		if(angular.isDefined($scope.new_snap.ignore_unavailable))
		{
			body["ignore_unavailable"] = $scope.new_snap.ignore_unavailable;
		}

		if(angular.isDefined($scope.new_snap.include_global_state))
		{
			body["include_global_state"] = true; //$scope.new_snap.include_global_state;
		}
		
		$scope.client.createSnapshot($scope.new_snap.repository, $scope.new_snap.name, JSON.stringify(body),
			function(response) {
				$scope.alert_service.success("Snapshot created");
				$scope.reload();
			},
			function(error) {
				$scope.updateModel(function() {
					$scope.alert_service.error("Error while creating snapshot", error);
				});
			}
		);
	};

	$scope.deleteSnapshot=function(snapshot){
			$scope.dialog_service.open(
			"are you sure you want to delete snapshot " + snapshot.snapshot + "?",
			snapshot,
			"Delete",
			function() {
				$scope.client.deleteSnapshot(
					snapshot.repository,
					snapshot.snapshot,
					function(response) {
						$scope.alert_service.success("Snapshot successfully deleted", response);
						$scope.reload();
					},
					function(error) {
						$scope.updateModel(function() {
							$scope.alert_service.error("Error while deleting snapshot", error);
						});
					}
				);
			}
		);
	};

	$scope.allSnapshots=function(repositories) {
		var all = [];
		$.each( repositories, function( index, value ){
			$scope.fetchSnapshots(index).then(
					function(data){
						$.merge($scope.snapshots, data );
					});
		});
		$scope.snapshots = all;
	};

	$scope.fetchSnapshots=function(repository) {
		var deferred = $q.defer();
		try {
			$scope.client.getSnapshots(repository,
				function(response) {
					var arr = response["snapshots"];
					if(arr && arr.constructor==Array && arr.length!=0){
						$.each(arr, function(index, value){
							value["repository"] = repository;
						});
					}
					deferred.resolve(response["snapshots"]);
				},
				function(error) {
					$scope.updateModel(function() {
						$scope.alert_service.error("Error while fetching snapshots", error);
					});
					deferred.resolve([]);
				}
			)
		} catch (error) {
			$scope.alert_service.error("Failed to load snapshots");
			deferred.resolve([]);
		}
		return deferred.promise;
	};

	$scope.loadSnapshots=function(repository) {
		try {
			$scope.client.getSnapshots(repository,
				function(response) {
					$scope.updateModel(function() {
						$scope.snapshots = response["snapshots"];
					});
				},
				function(error) {
					if (!(error['responseJSON'] != null )) {
						$scope.updateModel(function() {
							$scope.alert_service.error("Error while reading snapshots", error);
						});
					}
				}
			)
		} catch (error) {
			$scope.alert_service.error("Failed to load snapshots");
			return;
		}
	};

}
