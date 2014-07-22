function Paginator(page, page_size, collection, filter) {
    this.page = page;
    this.page_size = page_size;

    this.$collection = isDefined(collection) ? collection : [];

    this.filter = filter;

    this.$total = this.$collection.length;

    this.firstResult=function() {
        return this.$total > 0 ? ((this.page -1) * this.page_size) + 1 : 0;
    };

    this.lastResult=function() {
        return this.page * this.page_size > this.$total ? this.$total : this.page * this.page_size;
    };

    this.hasNextPage=function() {
        return this.page_size * this.page < this.$total;
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
        var page = this.$filtered_collection.slice(this.firstResult() -1, this.lastResult());
        while (page.length < this.page_size) {
            page.push(null);
        }
        return page;
    };

    this.setCollection=function(collection) {
        this.$collection = collection;
        this.refresh();
    };

    this.getTotal=function() {
        return this.$total;
    };

    this.getResults=function() {
        var filter = this.filter;
        var collection = this.$collection;
        if (filter.isBlank()) {
            return collection;
        } else {
            var filtered_collection = [];
            collection.forEach(function(item) {
                if (filter.matches(item)) {
                    filtered_collection.push(item);
                }
            });
            return filtered_collection;
        }
    };


    this.getCollection=function() {
        return this.$collection;
    };

    this.refresh=function() {
        this.$filtered_collection = this.getResults();
        this.$total = this.$filtered_collection.length;
        while (this.$total < this.firstResult()) {
          this.previousPage();
        }
    };

}