function Benchmark() {
	this.name = '';
	this.num_executor = 1;
	this.percentiles = '[10, 25, 50, 75, 90, 99]';
	this.competitors = [ ];
	
	this.addCompetitor=function(competitor) {
		this.competitors.push(competitor);
	};
	
	this.toJson=function() {
		var body = {};
		body.name = this.name;
		if (notEmpty(this.num_executor)) {
			body.num_executor_nodes = this.num_executor;
		}
		if (notEmpty(this.percentiles)) {
			body.percentiles = JSON.parse(this.percentiles);
		}
		if (this.competitors.length > 0) {
			body.competitors = this.competitors.map(function(c) { return c.toJson(); });
		}
		if (notEmpty(this.iterations)) {
			body.iterations = this.iterations;
		}
		if (notEmpty(this.concurrency)) {
			body.concurrency = this.concurrency;
		}
		if (notEmpty(this.multiplier)) {
			body.multiplier = this.multiplier;
		}
		if (notEmpty(this.num_slowest)) {
			body.num_slowest = this.num_slowest;
		}
		return JSON.stringify(body, null, 4);
	};
	
}

function Competitor() {
	this.name = '';

	// override benchmark options
	this.iterations = '';
	this.concurrency = '';
	this.multiplier = '';
	this.num_slowest = '';
	this.warmup = true;
	this.requests = [];
	
	// defined only by competitor
	this.search_type = 'query_then_fetch';
	this.indices = '';
	this.types = '';
	
	// cache
	this.filter_cache = false;
	this.field_data = false;
	this.recycler_cache = false;
	this.id_cache = false;
	
	this.cache_fields = '';
	this.cache_keys = '';
	
	this.toJson=function() {
		var body = {};
		body.name = this.name;
		if (notEmpty(this.requests)) {
			body.requests = JSON.parse(this.requests);
		}
		if (notEmpty(this.iterations)) {
			body.iterations = this.iterations;
		}
		if (notEmpty(this.concurrency)) {
			body.concurrency = this.concurrency;
		}
		if (notEmpty(this.multiplier)) {
			body.multiplier = this.multiplier;
		}
		if (notEmpty(this.num_slowest)) {
			body.num_slowest = this.num_slowest;
		}
		if (notEmpty(this.indices)) {
			body.indices = this.indices;
		}
		if (notEmpty(this.types)) {
			body.types = this.types;
		}

		body.search_type = this.search_type;

		body.clear_caches = {};
		body.clear_caches.filter = this.filter_cache;
		body.clear_caches.field_data = this.field_date;
		body.clear_caches.id = this.id_cache;
		body.clear_caches.recycler = this.recycler_cache;
		if (notEmpty(this.cache_fields)) {
			body.clear_caches.fields = this.cache_fields;
		}
		if (notEmpty(this.cache_keys)) {
			body.clear_caches.filter_keys = this.cache_keys;
		}
		
		return body;
	};
	
}