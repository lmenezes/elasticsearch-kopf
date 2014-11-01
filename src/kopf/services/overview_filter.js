kopf.factory('OverviewFilter', function() {

  this.node = new NodeFilter('', true, true, true, 0);

  this.index = new IndexFilter('', '', true, 0);

  this.page = 1;

  return this;

});
