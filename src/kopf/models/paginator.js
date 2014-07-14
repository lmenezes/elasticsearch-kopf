function Paginator(page, page_size, collection, filter) {
    this.page = page;
    this.page_size = page_size;

    this.collection = collection;
    this.filtered_collection = null;

    this.filter = filter;
    this.previous_filter = null;


    this.firstResult=function() {
        return this.total() > 0 ? ((this.page -1) * this.page_size) + 1 : 0;
    };

    this.lastResult=function() {
        return this.page * this.page_size > this.total() ? this.total() : this.page * this.page_size;
    };

    this.hasNextPage=function() {
        return this.page_size * this.page < this.total();
    };

    this.hasPreviousPage=function() {
        return this.page > 1;
    };

    this.nextPage=function() {
        this.page += 1;
    };

    this.previousPage=function() {
        this.page -= 1;
    };

    this.getPage=function() {
        return this.getResults().slice(this.firstResult() -1, this.lastResult());
    };

    this.setCollection=function(collection) {
        this.collection = collection;
        this.filtered_collection = null; // forces recalculation
        while (this.total() < this.firstResult()) {
            this.previousPage();
        }
    };

    this.total=function() {
        return this.getResults().length;
    };

    this.getResults=function() {
        var filter_changed = !this.filter.equals(this.previous_filter);
        if (filter_changed || !isDefined(this.filtered_collection)) {
            var filter = this.filter;
            this.previous_filter = this.filter.clone();
            var collection = this.collection;
            if (filter.isBlank()) {
                this.filtered_collection = this.collection;
            } else {
                var filtered_collection = [];
                collection.forEach(function(item) {
                    if (filter.matches(item)) {
                        filtered_collection.push(item);
                    }
                });
                this.filtered_collection = filtered_collection;
            }
        }
        return this.filtered_collection;
    };

    this.refresh=function() {
        this.setCollection(this.collection);
    };
}