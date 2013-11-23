function AliasesController($scope, $location, $timeout, AlertService) {
	$scope.aliases = null;
	$scope.new_index = {};
	$scope.pagination= new AliasesPagination(1, []);
	$scope.alert_service = AlertService;
	
	$scope.editor = ace.edit("alias-filter-editor");
	$scope.editor.setFontSize("10px");
	$scope.editor.setTheme("ace/theme/kopf");
	$scope.editor.getSession().setMode("ace/mode/json");
	
	$scope.viewDetails=function(alias) {
		$scope.details = alias;
	}

	$scope.addAlias=function() {
		$scope.formatBody();
		if ($scope.validation_error == null) {
			try {
				$scope.new_alias.validate();
				// if alias already exists, check if its already associated with index
				if (isDefined($scope.aliases.info[$scope.new_alias.alias])) { 
					var aliases = $scope.aliases.info[$scope.new_alias.alias];
					$.each(aliases,function(i, alias) {
						if (alias.index === $scope.new_alias.index) {
							throw "Alias is already associated with this index";
						} 
					});
				} else { 
					$scope.aliases.info[$scope.new_alias.alias] = [];
				}
				$scope.aliases.info[$scope.new_alias.alias].push($scope.new_alias);
				$scope.new_alias = new Alias();
				$scope.pagination.setResults($scope.aliases.info);
			} catch (error) {
				$scope.alert_service.error(error ,null);
			}
		}
	}
	
	$scope.removeAlias=function(alias) {
		delete $scope.aliases.info[alias];
		$scope.pagination.setResults($scope.aliases.info);
	}
	
	$scope.removeAliasFromIndex=function(index, alias_name) {
		var aliases = $scope.aliases.info[alias_name];
		var removeIndex = null;
		for (var i = 0; i < aliases.length; i++) {
			if (alias_name === aliases[i].alias) {
				removeIndex = i;
			}
		}
		if (removeIndex != null) {
			$scope.aliases.info[alias_name].splice(removeIndex,1);
		}
	}
	
	$scope.mergeAliases=function() {
		var deletes = [];
		var adds = [];
		Object.keys($scope.aliases.info).forEach(function(alias_name) {
			var aliases = $scope.aliases.info[alias_name];
			aliases.forEach(function(alias) {
				// if alias didnt exist, just add it
				if (!isDefined($scope.originalAliases.info[alias_name])) { 
					adds.push(alias);
				} else { 
					var originalAliases = $scope.originalAliases.info[alias_name];
					var addAlias = true;
					for (var i = 0; i < originalAliases.length; i++) {
						if (originalAliases[i].equals(alias)) {
							addAlias = false;
							break;
						}
					}
					if (addAlias) {
						adds.push(alias);
					}
				} 
			});
		});
		Object.keys($scope.originalAliases.info).forEach(function(alias_name) {
			var aliases = $scope.originalAliases.info[alias_name];
			aliases.forEach(function(alias) {
				if (!isDefined($scope.aliases.info[alias.alias])) {
					deletes.push(alias);
				} else {
					var newAliases = $scope.aliases.info[alias_name];
					var removeAlias = true;
					for (var i = 0; i < newAliases.length; i++) {
						if (alias.index === newAliases[i].index && alias.equals(newAliases[i])) {
							removeAlias = false;
							break;
						}
					}
					if (removeAlias) {
						deletes.push(alias);
					}
				}
			});
		});
		$scope.client.updateAliases(adds,deletes, 
			function(response) {
				$scope.loadAliases();
				$scope.alert_service.success("Aliases were successfully updated",response);
			},
			function(error) {
				$scope.alert_service.error("Error while updating aliases",error);
			}
		);
	}
	
	$scope.loadAliases=function() {
		$scope.new_alias = new Alias();
		$scope.client.fetchAliases(
			function(aliases) {
				$scope.originalAliases = aliases;
				$scope.aliases = jQuery.extend(true, {}, $scope.originalAliases);
				$scope.pagination.setResults($scope.aliases.info);
			},
			function(error) {
				$scope.alert_service.error("Error while fetching aliases",error);		
			}
		);
	}
	
	$scope.$on('hostChanged',function() {
		$scope.loadAliases();
	});
	
    $scope.$on('loadAliasesEvent', function() {
		$scope.loadAliases();
    });
	
	$scope.formatBody=function() {
		var source = $scope.editor.getValue();
		try {
			$scope.validation_error = null;
			var sourceObj = JSON.parse(source);
			var formattedSource = JSON.stringify(sourceObj,undefined,4);
			$scope.editor.setValue(formattedSource,0);
			$scope.editor.gotoLine(0,0,false);
			$scope.new_alias.filter = formattedSource;
		} catch (error) {
			$scope.validation_error = error.toString();
		}
	}

}