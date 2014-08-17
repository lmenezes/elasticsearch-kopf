function Index(index_name,index_info, index_metadata, index_status) {
	this.name = index_name;
	this.shards = null;
	this.metadata = {};
	this.aliases = getProperty(index_metadata,'aliases', []);

	this.visibleAliases=function() { return this.aliases.length > 5 ? this.aliases.slice(0,5) : this.aliases; };
	
	this.settings = index_metadata.settings;
	this.editable_settings = new EditableIndexSettings(index_metadata.settings);
	this.mappings = index_metadata.mappings;
	this.metadata.settings = this.settings;
	this.metadata.mappings = this.mappings;

	this.num_of_shards = getProperty(index_metadata.settings, 'index.number_of_shards');
	this.num_of_replicas = parseInt(getProperty(index_metadata.settings, 'index.number_of_replicas'));
	this.state = index_metadata.state;
	
	this.num_docs = getProperty(index_status, 'docs.num_docs', 0);
	this.max_doc = getProperty(index_status, 'docs.max_doc', 0);
	this.deleted_docs = getProperty(index_status, 'docs.deleted_docs', 0);
	this.size = getProperty(index_status, 'index.primary_size_in_bytes', 0);
	this.total_size = getProperty(index_status, 'index.size_in_bytes', 0);	
	this.size_in_bytes = readablizeBytes(this.size);
	this.total_size_in_bytes = readablizeBytes(this.total_size);
	
	var unassigned = [];

	// adds shard information
	
	var unhealthy = false;

    this.getShards=function(node_id) {
        if (isDefined(index_info)) {
            if (this.shards === null) {
                var index_shards = {};
                $.map(index_info.shards, function(shards, shard_num) {
                    $.map(shards, function(shard_routing, shard_copy) {
                        if (shard_routing.node === null) {
                            unassigned.push(new UnassignedShard(shard_routing));
                        } else {
                            if (!isDefined(index_shards[shard_routing.node])) {
                                index_shards[shard_routing.node] = [];
                            }
                            var shard_status = null;
                            if (isDefined(index_status) && isDefined(index_status.shards[shard_routing.shard])) {
                                index_status.shards[shard_routing.shard].forEach(function(status) {
                                    if (status.routing.node == shard_routing.node && status.routing.shard == shard_routing.shard) {
                                        shard_status = status;
                                    }
                                });
                            }
                            var new_shard = new Shard(shard_routing, shard_status);

                            if (new_shard.state == "RELOCATING" || new_shard.state == "INITIALIZING") {
                                unhealthy = true;
                            }

                            index_shards[shard_routing.node].push(new_shard);
                        }
                    });
                });
                this.shards = index_shards;
            }
        } else {
            this.shards = {};
        }
        return this.shards[node_id];
    };

	this.unhealthy = unhealthy || unassigned.length > 0;
	this.unassigned = unassigned;

    this.special = this.name.indexOf(".") === 0 || this.name.indexOf("_") === 0;

	this.compare=function(b) { // TODO: take into account index properties?
		return this.name.localeCompare(b.name);
	};
	
	this.getTypes=function() {
		return Object.keys(this.mappings).sort(function(a, b) { return a.localeCompare(b); });
	};
	
	this.getAnalyzers=function() {
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
        return ['float', 'double', 'byte', 'short', 'integer', 'long', 'nested', 'object'].indexOf(type) == -1;
	}
	
	this.getFields=function(type) {
        var fields = [];
		if (isDefined(this.mappings[type])) {
			fields = this.getProperties("", this.mappings[type].properties);
		}
        return fields.sort(function(a, b) { return a.localeCompare(b); });
	};

    this.getProperties=function(parent, fields) {
        var prefix = parent !== "" ? parent + "." : "";
        var validFields = [];
        for (var field in fields) {
            // multi field
            if (isDefined(fields[field].fields)) {
                var multiPrefix = fields[field].path != 'just_name' ? prefix + field : prefix;
                var multiProps = this.getProperties(multiPrefix, fields[field].fields);
                validFields = validFields.concat(multiProps);
            }
            // nested and object types
            if (fields[field].type == 'nested' || fields[field].type == 'object' || !isDefined(fields[field].type)) {
                var nestedProperties = this.getProperties(prefix + field,fields[field].properties);
                validFields = validFields.concat(nestedProperties);
            }
            // normal fields
            if (isDefined(fields[field].type) && isAnalyzable(fields[field].type)) {
                validFields.push(prefix + field);
            }
        }
        return validFields;
    };
	
	this.equals=function(index) { return index !== null && index.name == this.name; };
	
	this.closed=function() { return this.state === "close";	};
	
	this.open=function() { return this.state === "open"; };
}