function IndexSettingsController($scope, $location, $timeout) {
	var new_index = {};
	$scope.new_index = new_index;
	
	//index.cache.filter.max_size,index.cache.filter.expire
	var allowed_properties = ['index.number_of_replicas', 'index.auto_expand_replicas', 
	'index.blocks.read_only', 'index.blocks.read', 'index.blocks.write<', 'index.blocks.metadata',
	 'index.refresh_interval', 'index.term_index_interval', 'index.term_index_divisor', 
	 'index.translog.flush_threshold_ops', 'index.translog.flush_threshold_size', 
	 'index.translog.flush_threshold_period', 'index.translog.disable_flush', 
	 'index.routing.allocation.total_shards_per_node', 
	 'index.recovery.initial_shards', 'index.gc_deletes', 'index.ttl.disable_purge'];

	$scope.saveSettings=function(index_name) {
		$scope.cluster.indices.forEach(function(index) { 
			if (index.name === index_name) {
				var new_settings = {};
				allowed_properties.forEach(function(setting) {
					if (isDefined(index.settings[setting]) && index.settings[setting].length > 0) {
						new_settings[setting] = index.settings[setting];
					}
				});
				$scope.client.updateIndexSettings(index.name, JSON.stringify(new_settings, undefined, ""),
					function(response) {
						$scope.modal.alert = new SuccessAlert("Index settings were successfully updated", response);
						$scope.broadcastMessage('forceRefresh', {});
					},
					function(error) {
						$scope.modal.alert = new ErrorAlert("Error while updating index settings", error);
					}
				);
			}
		});
	}
}