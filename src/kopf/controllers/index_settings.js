function NewIndexSettingsController($scope, $location, $timeout, IndexSettingsService) {
	$scope.service = IndexSettingsService;
	
	//index.cache.filter.max_size,index.cache.filter.expire
	var allowed_properties = ['index.number_of_replicas', 'index.auto_expand_replicas', 
	'index.blocks.read_only', 'index.blocks.read', 'index.blocks.write<', 'index.blocks.metadata',
	 'index.refresh_interval', 'index.term_index_interval', 'index.term_index_divisor', 
	 'index.translog.flush_threshold_ops', 'index.translog.flush_threshold_size', 
	 'index.translog.flush_threshold_period', 'index.translog.disable_flush', 
	 'index.routing.allocation.total_shards_per_node', 
	 'index.recovery.initial_shards', 'index.gc_deletes', 'index.ttl.disable_purge'];
	 
	 $scope.back=function() {
		 $('#cluster_option a').tab('show');
	 }

	 $scope.save=function() {
		 var index = $scope.service.index;
		 var new_settings = {};
		 allowed_properties.forEach(function(setting) {
			 if (isDefined(index.settings[setting]) && index.settings[setting].length > 0) {
				 new_settings[setting] = index.settings[setting];
			 }
		 });
		 $scope.client.updateIndexSettings(index.name, JSON.stringify(new_settings, undefined, ""),
			 function(response) {
				 $scope.setAlert(new SuccessAlert("Index settings were successfully updated", response));
				 $scope.broadcastMessage('forceRefresh', {});
			 },
			 function(error) {
				 $scope.setAlert(new ErrorAlert("Error while updating index settings", error));
			 }
		 );
	 }
 }