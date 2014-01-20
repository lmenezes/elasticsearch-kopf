function RepositoryController($scope, $location, $timeout, ConfirmDialogService, AlertService) {

	$scope.alert_service = AlertService;
	$scope.dialog_service = ConfirmDialogService;
	
	$scope.editor = new AceEditor('repository-settings-editor');
	$scope.repositories = [];
	
    $scope.$on('loadRepositoryEvent', function() {
		$scope.loadRepositories();
    });
	
	$scope.deleteRepository=function(name, value){
		$scope.dialog_service.open(
			"are you sure you want to delete repository " + name + "?",
			value,
			"Delete",
			function() {
				$scope.client.deleteRepository(name,
					function(response) {
						$scope.alert_service.success("Repository successfully deleted", response);
						$scope.loadRepositories();
					},
					function(error) {
						$scope.updateModel(function() {
							$scope.alert_service.error("Error while deleting repositor", error);
						});
					}
				);
			}
		);
	}

	/*
		createRepository

		example:
			POST /_snapshot/my_repository/
			{
				"type": "fs",
				"settings": {
					"location": "/mount/backups/my_backup",
					"compress": true
				}
			}

		settings field from editor should contain:
		{
    		"location": "/mount/backups/my_backup",
    		"compress": true
		}
	*/
	$scope.createRepository=function(){
		$scope.new_repo.settings = $scope.editor.format();
		if ($scope.editor.error == null) {
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
	}

	$scope.loadRepositories=function() {
		try {			
			$scope.client.getRepositories(
				function(response) {
					$scope.updateModel(function() {
						$scope.repositories = response;
					});
				},
				function(error) {
					if (!(error['responseJSON'] != null )) {
						$scope.updateModel(function() {
							$scope.alert_service.error("Error while reading repositories", error);
						});
					}
				}
			)
		} catch (error) {
			$scope.alert_service.error("Failed to load repositories");
			return;
		}

	};

}
