function AliasesPagination(page, results) {
    this.page = page;
    this.page_size = 10;
    this.results = results;
    this.index = "";
    this.past_index = "";
    this.alias = "";
    this.past_alias = "";
    this.cached_results = null;

    this.firstResult=function() {
        if (this.getResults().length > 0) {
            return ((this.current_page() - 1) * this.page_size) + 1;
        } else {
            return 0;
        }
    };

    this.lastResult=function() {
        if (this.current_page() * this.page_size > this.getResults().length) {
            return this.getResults().length;
        } else {
            return this.current_page() * this.page_size;
        }
    };

    this.hasNextPage=function() {
        return this.page_size * this.current_page() < this.getResults().length;
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
        if (this.index != this.past_index || this.alias != this.past_alias) {
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
        results.forEach(function(warmer) {
            if (count < first_result || count > last_result) {
                count += 1;
            } else {
                count += 1;
                page.push(warmer);
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
        var filters_changed = this.index != this.past_index || this.alias != this.past_alias;
        if (filters_changed || !isDefined(this.cached_results)) { // if filters changed or no cached, calculate
            var index = this.index;
            var alias = this.alias;
            var results = this.results;
            results.forEach(function(index_alias) {
                var matches = true;
                if (isDefined(index) && index.length > 0 && index_alias.index.indexOf(index) == -1) {
                   matches = false;
                }

                if (matches && isDefined(alias) && alias.length > 0) {
                    matches = false;
                    for (var i = 0; i < index_alias.aliases.length; i++) {
                        if (index_alias.aliases[i].alias.indexOf(alias) != -1) {
                            matches = true;
                            break;
                        }
                    }
                }
                if (matches) {
                    matchingResults.push(index_alias);
                }
            });
            this.cached_results = matchingResults;
            this.past_index = this.index;
            this.past_alias = this.alias;
        }
        return this.cached_results;
    };
}