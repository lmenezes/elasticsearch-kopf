function ClusterHealthController($scope,$location,$timeout, AlertService) {
	$scope.shared_url = '';
	$scope.cluster_health = {};
	$scope.state = '';
	
	
	$scope.back=function() {
		$('#cluster_option a').tab('show');
	};
	
    $scope.$on('loadClusterHealth', function() {
		$('#cluster_health_option a').tab('show');
		$scope.cluster_health = null; // otherwise we see past version, then new
		$scope.state = ''; // informs about loading state
    });
	
	$scope.loadClusterHealth=function() {
		var cluster_health = null;
		$scope.cluster_health = null; // otherwise we see past version, then new
		$scope.state = "loading cluster health state. this could take a few moments...";
		$scope.client.getClusterDiagnosis(
			function(state, stats, hot_threads) {
				cluster_health = {};
				cluster_health.state = JSON.stringify(state, undefined, 4);
				cluster_health.stats = JSON.stringify(stats, undefined, 4);
				cluster_health.hot_threads = hot_threads;
				$scope.updateModel(function() {
					$scope.cluster_health = cluster_health;
					$scope.state = '';
				});
			},
			function(failed_request) {
				$scope.updateModel(function() {
					$scope.state = '';
					AlertService.error("Error while retrieving cluster health information", failed_request.responseText);
				});
		});
	};

	$scope.publishClusterHealth=function() {
		var gist = {};
		gist.description = 'Cluster information delivered by kopf';
		gist.public = true;
		gist.files = {};
		gist.files.state = {'content': $scope.cluster_health.state,'indent':'2', 'language':'JSON'};
		gist.files.stats = {'content': $scope.cluster_health.stats,'indent':'2', 'language':'JSON'} ;
		gist.files.hot_threads = {'content':$scope.cluster_health.hot_threads,'indent':'2', 'language':'JSON'};
		var data = JSON.stringify(gist, undefined, 4);
		$.ajax({ type: 'POST', url: "https://api.github.com/gists", dataType: 'json', data: data})
			.done(function(response) { 
				$scope.updateModel(function() {
					AlertService.success("Cluster health information successfully shared at: " + response.html_url, null, 60000);
				});
			})
			.fail(function(response) {
				$scope.updateModel(function() {
					AlertService.error("Error while publishing Gist", responseText);
				});
			}
		);
	};
}