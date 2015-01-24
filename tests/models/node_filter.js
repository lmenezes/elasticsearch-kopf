test("Blank node filter", function() {
    var filter = new NodeFilter("", true, true, true, 0);
    var node = { name: 'a', master: true, client: false, data: true };
    ok(filter.matches(node), "Matches any node if filter is blank");
})

test("Only master node filter x non master node", function() {
    var filter = new NodeFilter("", false, true, false, 0);
    var node = { name: 'a', master: false, client: false, data: true };
    ok(!filter.matches(node),"Doesnt match a non master node");
})

test("Only master node filter x master node", function() {
    var filter = new NodeFilter("", false, true, false, 0);
    var node = { name: 'a', master: true, client: false, data: true };
    ok(filter.matches(node),"Matches a master node");
})

test("Only data node filter x non data node", function() {
    var filter = new NodeFilter("", true, false, false, 0);
    var node = { name: 'a', master: false, client: true, data: false };
    ok(!filter.matches(node),"Doesnt match a non data node");
})

test("Only data node filter x data node", function() {
    var filter = new NodeFilter("", true, false, false, 0);
    var node = { name: 'a', master: false, client: false, data: true };
    ok(filter.matches(node),"Match a data node");
})

test("Only client node filter x non client node", function() {
    var filter = new NodeFilter("", false, false, true, 0);
    var node = { name: 'a', master: false, client: false, data: true };
    ok(!filter.matches(node), "Doesnt match a non client node");
})

test("Only client node filter x client node", function() {
    var filter = new NodeFilter("", false, false, true, 0);
    var node = { name: 'a', master: false, client: true, data: false };
    ok(filter.matches(node),"Match a client node");
})

test("Master or client node filter x data node", function() {
    var filter = new NodeFilter("", false, true, true, 0);
    var node = { name: 'a', master: false, client: false, data: true };
    ok(!filter.matches(node), "Doesnt match a non master/client node");
})

test("Master or client node filter x client node x master node", function() {
    var filter = new NodeFilter("", false, true, true, 0);
    var node = { name: 'a', master: false, client: true, data: false };
    var node2 = { name: 'a', master: true, client: false, data: false };
    ok(filter.matches(node),"Match a client node");
    ok(filter.matches(node2),"Match a master node");
})

test("node filter with name x non matching name", function() {
    var filter = new NodeFilter("moli", true, true, true, 0);
    var node = { name: 'milo_id', master: true, client: false, data: true };
    ok(!filter.matches(node),"Doesnt match if name is not a substring");
})

test("node filter with name x matching name", function() {
    var filter = new NodeFilter("moli", true, true, true, 0);
    var node = { name: 'moliware', master: true, client: false, data: true };
    ok(filter.matches(node),"Matches if name is not a substring");
})