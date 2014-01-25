function Index(index_name,index_info, index_metadata, index_status) {
	this.name = index_name;
	var index_shards = {};
	this.shards = index_shards;
	this.state = index_metadata.state;
	this.metadata = {};
	this.aliases = index_metadata.aliases;
	this.total_aliases = isDefined(index_metadata.aliases) ? index_metadata.aliases.length : 0;
	this.visibleAliases=function() {
		return this.total_aliases > 5 ? this.aliases.slice(0,5) : this.aliases;
	};
	this.settings = new IndexSettings(index_metadata.settings);
	this.mappings = index_metadata.mappings;
	this.metadata.settings = this.settings;
	this.metadata.mappings = this.mappings;

	// FIXME: 0.90/1.0 check
	if (isDefined(index_metadata.settings['index.number_of_shards'])) {
		this.num_of_shards = index_metadata.settings['index.number_of_shards'];
		this.num_of_replicas = parseInt(index_metadata.settings['index.number_of_replicas']);
	} else {
		this.num_of_shards = index_metadata.settings.index.number_of_shards;
		this.num_of_replicas = parseInt(index_metadata.settings.index.number_of_replicas);
	}
	
	this.state_class = index_metadata.state === "open" ? "success" : "active";
	this.visible = true;
	var unassigned = [];

	// adds shard information
	if (isDefined(index_status)) {
		$.map(index_status.shards, function(shards, shard_num) {
			$.map(shards, function(shard_info, shard_copy) {
				if (!isDefined(index_shards[shard_info.routing.node])) {
					index_shards[shard_info.routing.node] = [];
				}
				index_shards[shard_info.routing.node].push(new Shard(shard_info));
			});
		});
		this.metadata.stats = index_status;
	}
	// adds unassigned shards information
	if (index_info) {
		Object.keys(index_info.shards).forEach(function(x) { 
			var shards_info = index_info.shards[x];
			shards_info.forEach(function(shard_info) {
				if (shard_info.state === 'UNASSIGNED') {
					unassigned.push(new UnassignedShard(shard_info));	
				}
			});
		});
	}


	this.unassigned = unassigned;
	var has_status = this.state === 'open' && isDefined(index_status);
	this.num_docs = has_status && isDefined(index_status.docs) ? index_status.docs.num_docs : 0;
	this.max_doc = has_status && isDefined(index_status.docs) ? index_status.docs.max_doc : 0;
	this.deleted_docs = has_status && isDefined(index_status.docs) ? index_status.docs.deleted_docs : 0;
	this.size = has_status ? index_status.index.primary_size_in_bytes : 0;
	this.total_size = has_status ? index_status.index.size_in_bytes : 0;
	
	this.size_in_bytes = readablizeBytes(this.size);
	this.total_size_in_bytes = readablizeBytes(this.total_size);
	this.settingsAsString=function() {
		return hierachyJson(JSON.stringify(this.settings, undefined, ""));
	};
	this.compare=function(b) { // TODO: take into account index properties?
		return this.name.localeCompare(b.name);
	};
	
	this.getTypes=function() {
		return Object.keys(this.mappings).sort(function(a, b) { return a.localeCompare(b); });
	};
	
	this.getAnalyzers=function() {
		// FIXME: 0.90/1.0 check
		var analyzers = Object.keys(getProperty(this.settings,'index.analysis.analyzer', {}));
		if (analyzers.length === 0) {
			Object.keys(this.settings).forEach(function(setting) {
				if (setting.indexOf('index.analysis.analyzer') === 0) {
					var analyzer = setting.substring('index.analysis.analyzer.'.length);
					analyzer = analyzer.substring(0,analyzer.indexOf("."));
					if ($.inArray(analyzer, analyzers) == -1) {
						analyzers.push(analyzer);
					}
				}
			});			
		}
		return analyzers.sort(function(a, b) { return a.localeCompare(b); });
	};
	
	function isAnalyzable(type) {
		var non_analyzable_types = ['integer', 'long', 'float', 'double', 'multi_field'];
		return non_analyzable_types.indexOf(type) == -1;
	}
	
	this.getFields=function(type) {
		if (isDefined(this.mappings[type])) {
			var fields = this.mappings[type].properties;
			var validFields = [];
			Object.keys(fields).forEach(function(field) {
				// multi fields
				if (isDefined(fields[field].fields)) {
					var full_path = fields[field].path != 'just_name';
					var multi_fields = fields[field].fields;
					Object.keys(multi_fields).forEach(function(multi_field) {
						if (isAnalyzable(multi_fields[multi_field].type)) {
							if (field != multi_field && full_path) {
								validFields.push(field + "." + multi_field);		
							} else {
								validFields.push(multi_field);	
							}
						}
					});
				}
				// normal fields
				if (isAnalyzable(fields[field].type)) {
					validFields.push(field);
				}
			});
			return validFields.sort(function(a, b) { return a.localeCompare(b); });
		} else {
			return [];
		}
	};
}