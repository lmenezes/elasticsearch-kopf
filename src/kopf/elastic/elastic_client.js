function ElasticClient(connection) {
	this.host = connection.host;
	this.username = connection.username;
	this.password = connection.password;

	this.createAuthToken=function(username,password) {
		var auth = null;
		if (isDefined(username) && isDefined(password)) {
			auth = "Basic " + window.btoa(username + ":" + password);
		}
		return auth;
	};
	
	var auth = this.createAuthToken(connection.username, connection.password);
	var fetch_version = $.ajax({
		type: 'GET',
		url: connection.host + "/",
		beforeSend: function(xhr) {
			if (isDefined(auth)) {
				xhr.setRequestHeader("Authorization", auth);
			} 
		},
		data: {},
		async: false
	});
	
	var client = this;
	fetch_version.done(function(response) {
		try {
			var version = response.version.number;
            client.version = { 'str': version };
            var parts = version.split('.');
            client.version.major = parseInt(parts[0]);
            client.version.minor = parseInt(parts[1]);
            client.version.build = parseInt(parts[2]);
        } catch (error) {
			throw { message: "Version property could not bet read. Are you sure there is an ElasticSearch runnning at [" + connection.host + "]?", body: response };
		}
	});
	
	fetch_version.fail(function(error) {
		throw error.statusText;
	});

    this.versionCheck=function(version) {
        var parts = version.split('.');
        var mjr = parseInt(parts[0]);
        var mnr = parseInt(parts[1]);
        var bld = parseInt(parts[2]);
        var v = this.version;
        return (v.major > mjr || v.major == mjr && v.minor > mnr || v.major == mjr && v.minor == mnr && v.build >= bld);
    };

	this.createIndex=function(name, settings, callback_success, callback_error) {
		this.executeElasticRequest('POST', "/" + name, settings, callback_success, callback_error);
	};

	this.enableShardAllocation=function(callback_success, callback_error) {
		var new_settings = {"transient":{ "cluster.routing.allocation.disable_allocation":false }};
		this.executeElasticRequest('PUT', "/_cluster/settings",JSON.stringify(new_settings, undefined, ""), callback_success, callback_error);
	};

	this.disableShardAllocation=function(callback_success, callback_error) {
		var new_settings = {"transient":{ "cluster.routing.allocation.disable_allocation":true }};
		this.executeElasticRequest('PUT', "/_cluster/settings",JSON.stringify(new_settings, undefined, ""), callback_success, callback_error);
	};

	this.shutdownNode=function(node_id, callback_success, callback_error) {
		this.executeElasticRequest('POST', "/_cluster/nodes/" + node_id + "/_shutdown", {}, callback_success, callback_error);
	};

	this.openIndex=function(index, callback_success, callback_error) {
		this.executeElasticRequest('POST', "/" + index + "/_open", {}, callback_success, callback_error);
	};

	this.optimizeIndex=function(index, callback_success, callback_error) {
		this.executeElasticRequest('POST', "/" + index + "/_optimize", {}, callback_success, callback_error);
	};

	this.clearCache=function(index, callback_success, callback_error) {
		this.executeElasticRequest('POST', "/" + index + "/_cache/clear", {}, callback_success, callback_error);
	};

	this.closeIndex=function(index, callback_success, callback_error) {
		this.executeElasticRequest('POST', "/" + index + "/_close", {}, callback_success, callback_error);
	};

	this.refreshIndex=function(index, callback_success, callback_error) {
		this.executeElasticRequest('POST', "/" + index + "/_refresh", {}, callback_success, callback_error);
	};

	this.deleteIndex=function(name, callback_success, callback_error) {
		this.executeElasticRequest('DELETE', "/" + name, {}, callback_success, callback_error);
	};

	this.updateIndexSettings=function(name, settings, callback_success, callback_error) {
		this.executeElasticRequest('PUT', "/" + name + "/_settings", settings, callback_success, callback_error);
	};

	this.updateClusterSettings=function(settings, callback_success, callback_error) {
		this.executeElasticRequest('PUT', "/_cluster/settings", settings, callback_success, callback_error);
	};

	this.getNodes=function(callback_success, callback_error) {
		var nodes = [];
		var createNodes = function(response) {
			Object.keys(response.response.nodes).forEach(function(node_id) {
				nodes.push(new Node(node_id,response.response.nodes[node_id]));
			});
			callback_success(nodes);
		};
		this.executeElasticRequest('GET', "/_cluster/state", {}, createNodes, callback_error);
	};

	this.fetchAliases=function(callback_success, callback_error) {
		var createAliases=function(response) {
            var indices = Object.keys(response);
            var index_aliases = [];
            indices.forEach(function(index) {
                if (Object.keys(response[index].aliases).length > 0) {
                    var aliases = Object.keys(response[index].aliases).map(function(alias) {
                        var info = response[index].aliases[alias];
                        return new Alias(alias, index, info.filter, info.index_routing, info.search_routing);
                    });
                    index_aliases.push(new IndexAliases(index, aliases));
                }
            });
			callback_success(index_aliases);
		};
		this.executeElasticRequest('GET', "/_aliases",{}, createAliases, callback_error);
	};

	this.analyzeByField=function(index, type, field, text, callback_success, callback_error) {
		var buildTokens=function(response) {
			var tokens = response.tokens.map(function (token) {
				return new Token(token.token,token.start_offset,token.end_offset,token.position);
			});
			callback_success(tokens);
		};
		this.executeElasticRequest('GET', "/" + index + "/_analyze?field=" + type +"."+field,{'text':text}, buildTokens, callback_error);
	};

	this.analyzeByAnalyzer=function(index, analyzer, text, callback_success, callback_error) {
		var buildTokens=function(response) {
			var tokens = response.tokens.map(function (token) {
				return new Token(token.token,token.start_offset,token.end_offset,token.position);
			});
			callback_success(tokens);
		};
		this.executeElasticRequest('GET', "/" + index + "/_analyze?analyzer=" + analyzer,{'text':text}, buildTokens, callback_error);
	};

	this.updateAliases=function(add_aliases,remove_aliases, callback_success, callback_error) {
		var data = { actions: [] };
		remove_aliases.forEach(function(alias) { data.actions.push({'remove':alias.info()}); });
		add_aliases.forEach(function(alias) { data.actions.push({'add':alias.info()}); });
		this.executeElasticRequest('POST', "/_aliases",JSON.stringify(data), callback_success, callback_error);
	};

	this.getIndexWarmers=function(index, warmer, callback_success, callback_error) {
		var path = "/" + index + "/_warmer/" + warmer.trim();
        var parseWarmers = function(response) {
            var warmers = [];
            Object.keys(response).forEach(function(i) {
                var index = i;
                var index_warmers = response[index].warmers;
                Object.keys(index_warmers).forEach(function(warmer_id) {
                    warmers.push(new Warmer(warmer_id, index, index_warmers[warmer_id]));
                });
            });
            callback_success(warmers);
        };
		this.executeElasticRequest('GET', path ,{}, parseWarmers, callback_error);
	};
	
	this.deleteWarmupQuery=function(warmer, callback_success, callback_error) {
		var path = "/" + warmer.index + "/_warmer/" + warmer.id;
		this.executeElasticRequest('DELETE', path, {},callback_success, callback_error);
	};
	
	this.registerWarmupQuery=function(warmer, callback_success, callback_error) {
		var path = "/" + warmer.index + "/";
		if (notEmpty(warmer.types)) {
			path += warmer.types + "/";
		}
		path += "/_warmer/" + warmer.id.trim();
		this.executeElasticRequest('PUT', path ,warmer.source, callback_success, callback_error);
	};
	
	this.fetchPercolateQueries=function(index, body, callback_success, callback_error) {
		var path = "/" + index + "/.percolator/_search";
        var parsePercolators = function(response) {
            var collection = response.hits.hits.map(function(q) { return new PercolateQuery(q); });
            var percolators = new PercolatorsPage(body.from, body.size, response.hits.total, collection);
            callback_success(percolators);
        };
        this.executeElasticRequest('POST', path , JSON.stringify(body), parsePercolators, callback_error);
	};
	
	this.deletePercolatorQuery=function(index, id, callback_success, callback_error) {
		var path = "/" + index + "/.percolator/" + id;
		this.executeElasticRequest('DELETE', path, {}, callback_success, callback_error);
	};
	
	this.createPercolatorQuery=function(percolator, callback_success, callback_error) {
		var path = "/" + percolator.index + "/.percolator/" + percolator.id;
		this.executeElasticRequest('PUT', path, percolator.source, callback_success, callback_error);
	};
	
	this.getRepositories=function(callback_success, callback_error) {
		var parse_repositories = function(response) {
			var repositories = Object.keys(response).map(function(repository) {
				return new Repository(repository, response[repository]);
			});
			callback_success(repositories);
		};
		this.executeElasticRequest('GET', "/_snapshot/_all", {}, parse_repositories, callback_error);
	};

	this.createRepository=function(repository, body, callback_success, callback_error) {
		this.executeElasticRequest('POST', "/_snapshot/" + repository, body, callback_success, callback_error);
	};

	this.deleteRepository=function(repository, callback_success, callback_error) {
		this.executeElasticRequest('DELETE', "/_snapshot/" + repository, {}, callback_success, callback_error);
	};

	this.getSnapshots=function(repository, callback_success, callback_error){
		var path = "/_snapshot/" + repository + "/_all";
		var parseSnapshots = function(response) {
			var snapshots = response.snapshots.map(function(snapshot) { return new Snapshot(snapshot); } );
			callback_success(snapshots);
		};
		this.executeElasticRequest('GET', path, {}, parseSnapshots, callback_error);
	};

	this.deleteSnapshot=function(repository, snapshot, callback_success, callback_error){
		this.executeElasticRequest('DELETE', "/_snapshot/" + repository + "/" +snapshot, {}, callback_success, callback_error);
	};

	this.restoreSnapshot=function(repository, snapshot, body, callback_success, callback_error){
		this.executeElasticRequest('POST', "/_snapshot/" + repository + "/" +snapshot + "/_restore", body, callback_success, callback_error);
	};

	this.createSnapshot=function(repository, snapshot, body, callback_success, callback_error){
		this.executeElasticRequest('PUT', "/_snapshot/" + repository + "/" +snapshot, body, callback_success, callback_error );
	};
	
	this.executeBenchmark=function(body, callback_success, callback_error){
		this.executeElasticRequest('PUT', "/_bench", body, callback_success, callback_error );
	};

	this.executeElasticRequest=function(method, path, data, callback_success, callback_error) {
		var url = this.host + path;
		this.executeRequest(method,url,this.username,this.password, data, callback_success, callback_error);
	};
	
	this.executeRequest=function(method, url, username, password, data, callback_success, callback_error) {
		var auth = this.createAuthToken(username,password);
		$.when(
			$.ajax({
				type: method,
				url: url,
				beforeSend: function(xhr) {
					if (isDefined(auth)) {
						xhr.setRequestHeader("Authorization", auth);
					}
				},
				data: data
		})).then(
			function(r) {
				callback_success(r);
			},
			function(error) {
				callback_error(error);
			}
		);
	};

	/** ####### END OF REFACTORED AREA ####### **/

	this.getClusterHealth=function(callback_success, callback_error) {
		var url = this.host + "/_cluster/health";
		var auth = this.createAuthToken(this.username,this.password);
		$.when(
			$.ajax({
				type: 'GET',
				url: url,
				dataType: 'json',
				data: {},
				beforeSend: function(xhr) {
					if (isDefined(auth)) {
						xhr.setRequestHeader("Authorization", auth);
					}
				}
			})).then(
				function(cluster_health) {
					callback_success(new ClusterHealth(cluster_health));
				},
				function(cluster_health) {
					callback_error(cluster_health);
				}
		);
	};

	this.getClusterDetail=function(callback_success, callback_error) {
		var host = this.host;
		var auth = this.createAuthToken(this.username,this.password);
		$.when(
			$.ajax({ 
				type: 'GET', 
				url: host+"/_cluster/state", 
				dataType: 'json', 
				data: {},
				beforeSend: function(xhr) { 
					if (isDefined(auth)) {
						xhr.setRequestHeader("Authorization", auth);
					} 
				}
			}),
			$.ajax({
				type: 'GET',
				url: host+"/_nodes/stats?all=true", 
				dataType: 'json', 
				data: {}, 
				beforeSend: function(xhr) { 
					if (isDefined(auth)) {
						xhr.setRequestHeader("Authorization", auth);
					} 
				}
			}),
			$.ajax({
				type: 'GET',
				url: host+"/_status", 
				dataType: 'json', 
				data: {}, 
				beforeSend: function(xhr) { 
					if (isDefined(auth)) {
						xhr.setRequestHeader("Authorization", auth);
					}
				}
			}),
			$.ajax({
				type: 'GET',
				url: host+"/_cluster/settings", 
				dataType: 'json', 
				data: {}, 
				beforeSend: function(xhr) { 
					if (isDefined(auth)) {
						xhr.setRequestHeader("Authorization", auth);
					} 
				}
			})
		).then(
			function(cluster_state,nodes_stats,cluster_status,settings) {
				callback_success(new Cluster(cluster_state[0],cluster_status[0],nodes_stats[0],settings[0]));
			},
			function(error) {
				callback_error(error);
			}
		);
	};

	this.getClusterDiagnosis=function(health, state, stats, hotthreads, callback_success,callback_error) {
		var host = this.host;
		var auth = this.createAuthToken(this.username,this.password);
		var deferreds = [];
		if (health) {
			deferreds.push(
				$.ajax({ 
					type: 'GET', 
					url: host+"/_cluster/health", 
					dataType: 'json', 
					data: {},
					beforeSend: function(xhr) { 
						if (isDefined(auth)) {
							xhr.setRequestHeader("Authorization", auth);
						} 
					}
				})
			);
		}
		if (state) {
			deferreds.push(
				$.ajax({ 
					type: 'GET', 
					url: host+"/_cluster/state", 
					dataType: 'json', 
					data: {},
					beforeSend: function(xhr) { 
						if (isDefined(auth)) {
							xhr.setRequestHeader("Authorization", auth);
						} 
					}
				})
			);
		}
		if (stats) {
			deferreds.push(
				$.ajax({ 
					type: 'GET', 
					url: host+"/_nodes/stats?all=true", 
					dataType: 'json', 
					data: {},
					beforeSend: function(xhr) { 
						if (isDefined(auth)) {
							xhr.setRequestHeader("Authorization", auth);
						} 
					}
				})
			);
		}
		if (hotthreads) {
			deferreds.push(
				$.ajax({ 
					type: 'GET', 
					url: host+"/_nodes/hot_threads", 
					data: {},
					beforeSend: function(xhr) { 
						if (isDefined(auth)) {
							xhr.setRequestHeader("Authorization", auth);
						} 
					}
				})	
			);
		}
		$.when.apply($, deferreds).then(
			function() {
				callback_success(arguments);
			},
			function(failed_request) {
				callback_error(failed_request);
			}
		);
	};
}












