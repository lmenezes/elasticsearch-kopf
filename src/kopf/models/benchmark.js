function Benchmark() {
	this.name = '';
	this.num_executor = 1;
	this.percentiles = '[10, 25, 50, 75, 90, 99]';
	// can be overriden by competitors
	this.iterations = '';
	this.concurrency = '';
	this.multiplier = '';
	this.warmup = true;
	this.num_slowest = '';
	this.requests = "";
	this.competitors = [ new Competitor() ];
	
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
	this.search_type = 'search_then_fetch';
	this.indices = '[]';
	this.types = '[]';
	
	this.toJson=function() {
		var body = {};
		body.name = this.name;
		if (notEmpty(this.requests)) {
			body.requests = JSON.parse(this.requests);
		}
		return body;
	};
	
}