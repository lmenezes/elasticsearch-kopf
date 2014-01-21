function ElasticClient(host,username,password) {
	this.host = host;
	this.username = username;
	this.password = password;
	
	this.createIndex=function(name, settings, callback_success, callback_error) {
		this.syncRequest('POST', "/" + name, settings, callback_success, callback_error);
	};

	this.enableShardAllocation=function(callback_success, callback_error) {
		var new_settings = {"transient":{ "cluster.routing.allocation.disable_allocation":false }};
		this.syncRequest('PUT', "/_cluster/settings",JSON.stringify(new_settings, undefined, ""), callback_success, callback_error);
	};

	this.disableShardAllocation=function(callback_success, callback_error) {
		var new_settings = {"transient":{ "cluster.routing.allocation.disable_allocation":true }};
		this.syncRequest('PUT', "/_cluster/settings",JSON.stringify(new_settings, undefined, ""), callback_success, callback_error);
	};

	this.getClusterState=function(callback_success, callback_error) {
		this.syncRequest('GET', "/_cluster/state",{}, callback_success, callback_error);
	};

	this.shutdownNode=function(node_id, callback_success, callback_error) {
		this.syncRequest('POST', "/_cluster/nodes/" + node_id + "/_shutdown", {}, callback_success, callback_error);
	};

	this.openIndex=function(index, callback_success, callback_error) {
		this.syncRequest('POST', "/" + index + "/_open", {}, callback_success, callback_error);
	};

	this.optimizeIndex=function(index, callback_success, callback_error) {
		this.syncRequest('POST', "/" + index + "/_optimize", {}, callback_success, callback_error);
	};

	this.clearCache=function(index, callback_success, callback_error) {
		this.syncRequest('POST', "/" + index + "/_cache/clear", {}, callback_success, callback_error);
	};

	this.closeIndex=function(index, callback_success, callback_error) {
		this.syncRequest('POST', "/" + index + "/_close", {}, callback_success, callback_error);
	};

	this.refreshIndex=function(index, callback_success, callback_error) {
		this.syncRequest('POST', "/" + index + "/_refresh", {}, callback_success, callback_error);
	};

	this.deleteIndex=function(name, callback_success, callback_error) {
		this.syncRequest('DELETE', "/" + name, {}, callback_success, callback_error);
	};

	this.updateIndexSettings=function(name, settings, callback_success, callback_error) {
		this.syncRequest('PUT', "/" + name + "/_settings", settings, callback_success, callback_error);
	};

	this.updateClusterSettings=function(settings, callback_success, callback_error) {
		this.syncRequest('PUT', "/_cluster/settings", settings, callback_success, callback_error);
	};

	this.getNodes=function(callback_success, callback_error) {
		var nodes = [];
		var createNodes = function(response) {
			Object.keys(response.response.nodes).forEach(function(node_id) {
				nodes.push(new Node(node_id,response.response.nodes[node_id]));
			});
			callback_success(nodes);
		};
		this.syncRequest('GET', "/_cluster/state", {}, createNodes, callback_error);
	};

	this.fetchAliases=function(callback_success, callback_error) {
		var createAliases=function(response) {
			callback_success(new Aliases(response));
		};
		this.syncRequest('GET', "/_aliases",{},createAliases, callback_error);
	};

	this.analyzeByField=function(index, type, field, text, callback_success, callback_error) {
		var buildTokens=function(response) {
			var tokens = response.tokens.map(function (token) {
				return new Token(token.token,token.start_offset,token.end_offset,token.position);
			});
			callback_success(tokens);	
		};
		this.syncRequest('GET', "/" + index + "/_analyze?field=" + type +"."+field,{'text':text}, buildTokens, callback_error);
	};

	this.analyzeByAnalyzer=function(index, analyzer, text, callback_success, callback_error) {
		var buildTokens=function(response) {
			var tokens = response.tokens.map(function (token) {
				return new Token(token.token,token.start_offset,token.end_offset,token.position);
			});
			callback_success(tokens);	
		};
		this.syncRequest('GET', "/" + index + "/_analyze?analyzer=" + analyzer,{'text':text}, buildTokens, callback_error);
	};

	this.updateAliases=function(add_aliases,remove_aliases, callback_success, callback_error) {
		var data = {};
		if (add_aliases.length === 0 && remove_aliases.length === 0) {
			throw "No changes were made: nothing to save";
		}
		data.actions = [];
		remove_aliases.forEach(function(alias) {
			data.actions.push({'remove':alias.info()});
		});
		add_aliases.forEach(function(alias) {
			data.actions.push({'add':alias.info()});
		});
		this.syncRequest('POST', "/_aliases",JSON.stringify(data, undefined, ""), callback_success, callback_error);
	};

	this.getNodesStats=function(callback_success, callback_error) {
		this.syncRequest('GET', "/_nodes/stats?all=true",{},callback_success, callback_error);
	};
	
	this.getIndexWarmers=function(index, warmer, callback_success, callback_error) {
		var path = "/" + index + "/_warmer/" + warmer.trim();
		this.syncRequest('GET', path ,{},callback_success, callback_error);
	};
	
	this.deleteWarmupQuery=function(index, warmer, callback_success, callback_error) {
		var path = "/" + index + "/_warmer/" + warmer;
		this.syncRequest('DELETE', path, {},callback_success, callback_error);
	};
	
	this.registerWarmupQuery=function(index, types, warmer_id, source, callback_success, callback_error) {
		var path = "/" + index + "/";
		if (notEmpty(types)) {
			path += types + "/";
		}
		path += "/_warmer/" + warmer_id.trim();
		this.syncRequest('PUT', path ,source,callback_success, callback_error);
	};
	
	this.fetchPercolateQueries=function(index, body, callback_success, callback_error) {
		var path = "/" + index + "/.percolator/_search";
		this.syncRequest('POST', path , body,callback_success, callback_error);
	};
	
	this.deletePercolatorQuery=function(index, id, callback_success, callback_error) {
		this.syncRequest('DELETE', "/" + index + "/.percolator/" + id, {}, callback_success, callback_error);
	};
	
	this.createPercolatorQuery=function(index, id, body, callback_success, callback_error) {
		this.syncRequest('PUT', "/" + index + "/.percolator/" + id, body, callback_success, callback_error);
	};
	
	this.getRepositories=function(callback_success, callback_error) {
		this.syncRequest('GET', "/_snapshot/_all", {}, callback_success, callback_error);	
	};

	this.createRepository=function(repository, body, callback_success, callback_error) {
		this.syncRequest('POST', "/_snapshot/" + repository, body, callback_success, callback_error);
	};

	this.deleteRepository=function(repository, callback_success, callback_error) {
		this.syncRequest('DELETE', "/_snapshot/" + repository, {}, callback_success, callback_error);
	};

	this.getSnapshots=function(repository, callback_success, callback_error){
		this.synchRequest('GET', "/_snapshot/" + repository + "/_all", callback_success, callback_error);
	};

	this.syncRequest=function(method, path, data, callback_success, callback_error) {
		var url = this.host + path;
		this.executeRequest(method,url,this.username,this.password, data, callback_success, callback_error);
	};
	
	this.createAuthToken=function(username,password) {
		var auth = null;
		if (isDefined(username) && isDefined(password)) {
			auth = "Basic " + window.btoa(username + ":" + password);
		}
		return auth;
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
				},
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

	this.getClusterDiagnosis=function(callback_success,callback_error) {
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
				url: host+"/_nodes/hot_threads", 
				data: {},
				beforeSend: function(xhr) { 
					if (isDefined(auth)) {
						xhr.setRequestHeader("Authorization", auth);
					} 
				}
			})
		).then(
				function(state, stats, hot_threads) {
					callback_success(state[0], stats[0], hot_threads[0]);
				},
				function(failed_request) {
					callback_error(failed_request);
				}
			);
	};
}












