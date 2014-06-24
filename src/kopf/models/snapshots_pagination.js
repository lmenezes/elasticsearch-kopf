function SnapshotPagination(page, results) {
	this.page = page;
	this.page_size = 10;
	this.results = results;
	this.snapshot_name = "";
	this.past_snapshot_name = null;
	this.total = 0;
	this.cached_results = null;
	
	this.firstResult=function() {
		if (Object.keys(this.getResults()).length > 0) {
			return ((this.current_page() - 1) * this.page_size) + 1;
		} else {
			return 0;
		}
	};
	
	this.lastResult=function() {
		if (this.current_page() * this.page_size > Object.keys(this.getResults()).length) {
			return Object.keys(this.getResults()).length;
		} else {
			return this.current_page() * this.page_size;
		}
	};

	this.hasNextPage=function() {
		return this.page_size * this.current_page() < Object.keys(this.getResults()).length;
	};
	
	this.hasPreviousPage=function() {
		return this.current_page() > 1;
	};
	
	this.nextPage=function() {
		this.page += 1;
	};
	
	this.previousPage=function() {
		this.page -= 1;
	};
	
	this.current_page=function() {
		if (this.snapshot_name != this.past_snapshot_name) {
			this.page = 1;
		}
		return this.page;
	};
	
	this.getPage=function() {
		var count = 1;
		var first_result = this.firstResult();
		var last_result = this.lastResult();
		var page = [];
		var results = this.getResults();
		results.forEach(function(snapshot) {
			if (count < first_result || count > last_result) {
				count += 1;
			} else {
				count += 1;
				page.push(snapshot);
			}
		});
		return page;
	};
	
	this.setResults=function(results) {
		this.results = results;
		// forces recalculation of page
		this.cached_results = null; 
		while (this.total() < this.firstResult()) {
			this.previousPage();
		}
	};
	
	this.total=function() {
		return this.getResults().length;
	};
	
	this.getResults=function() {
		var matchingResults = [];
		var filters_changed = this.snapshot_name != this.past_snapshot_name;
		if (filters_changed || !isDefined(this.cached_results)) { // if filters changed or no cached, calculate
			var snapshot_name = this.snapshot_name;
			var results = this.results;
			results.forEach(function(current_snapshot) {
				if (isDefined(snapshot_name) && snapshot_name.length > 0) {
					if (current_snapshot.name.indexOf(snapshot_name) != -1) {
						matchingResults.push(current_snapshot);
					} 
				} else {
					matchingResults.push(current_snapshot);
				}
			});
			this.cached_results = matchingResults;
			this.past_snapshot_name = this.snapshot_name;
		}
		return this.cached_results;
	};
}