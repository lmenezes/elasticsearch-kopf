function GlobalController($scope, $location, $timeout, $sce, ConfirmDialogService, AlertService, SettingsService) {
	$scope.dialog = ConfirmDialogService;
	$scope.version = "1.0.0-SNAPSHOT";
	$scope.username = null;
	$scope.password = null;
	$scope.alerts_service = AlertService;
	
	$scope.setConnected=function(status) {
		$scope.is_connected = status;
	};

	$scope.broadcastMessage=function(message,args) {
		$scope.$broadcast(message,args);
	};
	
	$scope.readParameter=function(name){
		var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
		return isDefined(results) ? results[1] : null;
	};
	
	$scope.setHost=function(url) {
		var exp = /^(https|http):\/\/(\w+):(\w+)@(.*)/i;
		// expected: "http://user:password@host", "http", "user", "password", "host"]
		var url_parts = exp.exec(url);
		if (isDefined(url_parts)) {
			$scope.host = url_parts[1] + "://" + url_parts[4];
			$scope.username = url_parts[2];
			$scope.password = url_parts[3];
		} else {
			$scope.username = null;
			$scope.password = null;
			$scope.host = url;
		}
		$scope.setConnected(false);
		$scope.client = new ElasticClient($scope.host,$scope.username,$scope.password);
		$scope.broadcastMessage('hostChanged',{});
	};
	
	if ($location.host() === "") { // when opening from filesystem
		$scope.setHost("http://localhost:9200");
	} else {
		var location = $scope.readParameter('location');
		if (isDefined(location)) {
			$scope.setHost(location);
		} else {
			$scope.setHost($location.protocol() + "://" + $location.host() + ":" + $location.port());			
		}
	}
	$scope.modal = new ModalControls();
	$scope.alert = null;
	$scope.is_connected = false;

	$scope.alertClusterChanges=function(cluster) {
		if (isDefined($scope.cluster) && isDefined(cluster)) {
			var changes = $scope.cluster.getChanges(cluster);
			if (changes.hasChanges()) {
				if (changes.hasJoins()) {
					var joins = changes.nodeJoins.map(function(node) { return node.name + "[" + node.transport_address + "]"; });
					AlertService.info(joins.length + " new node(s) joined the cluster", joins);
				}
				if (changes.hasLeaves()) {
					var leaves = changes.nodeLeaves.map(function(node) { return node.name + "[" + node.transport_address + "]"; });
					AlertService.warn(changes.nodeLeaves.length + " node(s) left the cluster", leaves);
				}
			}
		}
	};
		
	$scope.refreshClusterState=function() {
		$timeout(function() { 
			$scope.client.getClusterDetail(
				function(cluster) {
					$scope.updateModel(function() { 
						$scope.alertClusterChanges(cluster);
						$scope.cluster = cluster; 
					});
				},
				function(error) {
					$scope.updateModel(function() { 
						AlertService.error("Error while retrieving cluster information", error);
						$scope.cluster = null; 
					});
				}
			);
			
			$scope.client.getClusterHealth( 
				function(cluster) {
					$scope.updateModel(function() { 
						$scope.cluster_health = cluster;
						$scope.setConnected(true);
					});
				},
				function(error) {
					$scope.updateModel(function() {
						$scope.cluster_health = null;
						$scope.setConnected(false);
						AlertService.error("Error connecting to [" + $scope.host + "]",error);						
					});
				}
			);
		}, 100);	
	};

	$scope.autoRefreshCluster=function() {
		$scope.refreshClusterState();
		$timeout(function() { $scope.autoRefreshCluster(); }, SettingsService.getRefreshInterval());	
	};
	
	$scope.autoRefreshCluster();

	$scope.hasConnection=function() {
		return $scope.is_connected;
	};
	
	$scope.isActive=function(tab) {
		return $('#' + tab).hasClass('active');
	};
	
	$scope.getHost=function() {
		return $scope.host;
	};
	
	$scope.readablizeBytes=function(bytes) {
		if (bytes > 0) {
			var s = ['b', 'KB', 'MB', 'GB', 'TB', 'PB'];
			var e = Math.floor(Math.log(bytes) / Math.log(1024));
			return (bytes / Math.pow(1024, e)).toFixed(2) + s[e];	
		} else {
			return 0;
		}
	};

	$scope.displayInfo=function(title,info) {
		$scope.modal.title = title;
		$scope.modal.info = $sce.trustAsHtml(JSONTree.create(info));
		$('#modal_info').modal({show:true,backdrop:true});
	};
	
	$scope.isInModal=function() {
		return ($('.modal-backdrop').length > 0);
	};
	
	$scope.getCurrentTime=function() {
		return getTimeString();
	};
	
	$scope.selectTab=function(event) {
		AlertService.clear();
		if (isDefined(event)) {
			$scope.broadcastMessage(event, {});
		}
	};
	
	$scope.updateModel=function(action) {
		$scope.$apply(action);
	};
	
}