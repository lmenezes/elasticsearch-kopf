test("Filters out special indices", function() {
    var filter = new IndexFilter("", true, false, true, 0);
    var index = new Index('index_name', null, {}, {});
    index.special = true;
    ok(!filter.matches(index), "Filters out special indices");
})

test("Maintains special indices", function() {
  var filter = new IndexFilter("", true, true, true, 0);
  var index = new Index('index_name', null, {}, {});
  index.special = true;
  ok(filter.matches(index), "Filters out special indices");
})

test("Filters out closed indices", function() {
  var filter = new IndexFilter("", false, true, true, 0);
  var index = new Index('index_name', null, {}, {});
  index.closed = true;
  ok(!filter.matches(index), "Filters out closed indices");
})

test("Maintains closed indices", function() {
  var filter = new IndexFilter("", true, true, true, 0);
  var index = new Index('index_name', null, {}, {});
  index.closed = true;
  ok(filter.matches(index), "Filters out closed indices");
})


test("Filter by name on different name index", function() {
    var filter = new IndexFilter("abc", true,  true, true, 0);
    var index = new Index('cba', null, {}, {});
    ok(!filter.matches(index), "Doesnt match if filter name is not a substring of name");
})

test("Filter by name on index with matching name", function() {
    var filter = new IndexFilter("abc", true, true, true, 0);
    var index = new Index('abcdef', null, {}, {});
    ok(filter.matches(index), "Matches if filter name is a substring of name");
})

test("Filter by name regexp on index with matching name", function() {
    var filter = new IndexFilter("a\.+f", true, true, true, 0);
    var index = new Index('abcdef', null, {}, {});
    ok(filter.matches(index), "Matches if filter reg exp matches index name");
})

test("Use regexp as plain string if regexp doesnt compile", function() {
    var filter = new IndexFilter("a\.f-", true, true, true, 0);
    var index = new Index('a.f-', null, {}, {});
    ok(filter.matches(index), "Matches if filter reg exp matches index name");
})

test("Use regexp as plain string if regexp doesnt compile", function() {
    var filter = new IndexFilter("a\.f-", true, true, true, 0);
    var index = new Index('a.f-', null, {}, {});
    ok(filter.matches(index), "Matches if filter non compiling reg exp matches index name");
})
