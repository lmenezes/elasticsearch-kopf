// isDefined tests
test("index creating", function() {
	// 0.90.0 BASED
	var metadata = JSON.parse('{ "state": "open", "settings": { "index": { "uuid": "52MEVxx7TvSyUxFcZ6nQRg", "analysis": { "analyzer": { "kopf_analyzer": { "type": "custom", "tokenizer": "whitespace" } } }, "number_of_replicas": "1", "number_of_shards": "2", "version": { "created": "1000051" } } }, "mappings": { "type1": { "properties": { "int_field": { "type": "integer" }, "mv_field": { "type": "string", "fields": { "mv_field_raw": { "type": "string" } } }, "string_field": { "index": "not_analyzed", "norms": { "enabled": false }, "index_options": "docs", "type": "string" }, "mv_field_path": { "path": "just_name", "type": "string", "fields": { "mv_field_path_raw": { "type": "string" } } } } } }, "aliases": [] }');
	var routing = JSON.parse('{ "shards": { "0": [ { "state": "STARTED", "primary": true, "node": "nXDH7dTkQYKEimIcA4NZQg", "relocating_node": null, "shard": 0, "index": "kopf_test" }, { "state": "UNASSIGNED", "primary": false, "node": null, "relocating_node": null, "shard": 0, "index": "kopf_test" } ], "1": [ { "state": "STARTED", "primary": true, "node": "nXDH7dTkQYKEimIcA4NZQg", "relocating_node": null, "shard": 1, "index": "kopf_test" }, { "state": "UNASSIGNED", "primary": false, "node": null, "relocating_node": null, "shard": 1, "index": "kopf_test" } ] } }');
	var status = JSON.parse('{ "index": { "primary_size_in_bytes": 198, "size_in_bytes": 198 }, "translog": { "operations": 0 }, "docs": { "num_docs": 10, "max_doc": 13, "deleted_docs": 3 }, "merges": { "current": 0, "current_docs": 0, "current_size_in_bytes": 0, "total": 0, "total_time_in_millis": 0, "total_docs": 0, "total_size_in_bytes": 0 }, "refresh": { "total": 2, "total_time_in_millis": 0 }, "flush": { "total": 0, "total_time_in_millis": 0 }, "shards": { "0": [ { "routing": { "state": "STARTED", "primary": true, "node": "nXDH7dTkQYKEimIcA4NZQg", "relocating_node": null, "shard": 0, "index": "kopf_test" }, "state": "STARTED", "index": { "size_in_bytes": 99 }, "translog": { "id": 1390777285888, "operations": 0 }, "docs": { "num_docs": 0, "max_doc": 0, "deleted_docs": 0 }, "merges": { "current": 0, "current_docs": 0, "current_size_in_bytes": 0, "total": 0, "total_time_in_millis": 0, "total_docs": 0, "total_size_in_bytes": 0 }, "refresh": { "total": 1, "total_time_in_millis": 0 }, "flush": { "total": 0, "total_time_in_millis": 0 } } ], "1": [ { "routing": { "state": "STARTED", "primary": true, "node": "nXDH7dTkQYKEimIcA4NZQg", "relocating_node": null, "shard": 1, "index": "kopf_test" }, "state": "STARTED", "index": { "size_in_bytes": 99 }, "translog": { "id": 1390777285936, "operations": 0 }, "docs": { "num_docs": 0, "max_doc": 0, "deleted_docs": 0 }, "merges": { "current": 0, "current_docs": 0, "current_size_in_bytes": 0, "total": 0, "total_time_in_millis": 0, "total_docs": 0, "total_size_in_bytes": 0 }, "refresh": { "total": 1, "total_time_in_millis": 0 }, "flush": { "total": 0, "total_time_in_millis": 0 } } ] } }');
	var index = new Index('kopf_test', routing, metadata, status);
	
	// metadata info
	ok(index.num_of_shards == 2, "Checking number of shards");
	ok(index.num_of_replicas == 1, "Checking number of replicas");
	ok(index.state == 'open', "Checking index state");
	// status info
	ok(index.size == 198, "Checking primary size");
	ok(index.total_size == 198, "Checking total size");
	ok(index.size_in_bytes == '198.00b', "Checking primary size");
	ok(index.total_size_in_bytes == '198.00b', "Checking total size");
	ok(index.num_docs == 10, "Checking num docs");
	ok(index.max_doc == 13, "Checking max doc");
	ok(index.deleted_docs == 3, "Checking deleted docs");

});


