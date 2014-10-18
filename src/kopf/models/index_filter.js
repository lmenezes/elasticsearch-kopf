function IndexFilter(name, state, hideSpecial, timestamp) {
  this.name = name;
  this.state = state;
  this.hide_special = hideSpecial;
  this.timestamp = timestamp;

  this.clone = function() {
    return new IndexFilter(this.name, this.state, this.hide_special,
      this.timestamp);
  };

  this.equals = function(other) {
    return (
      other !== null &&
      this.name == other.name &&
      this.state == other.state &&
      this.hide_special === other.hide_special &&
      this.timestamp == other.timestamp
      );
  };

  this.isBlank = function() {
    var emptyNameFilter = !notEmpty(this.name);
    var emptyStateFilter = !notEmpty(this.state);
    var disabledHideSpecial = !notEmpty(this.hide_special);
    return emptyNameFilter && emptyStateFilter && disabledHideSpecial;
  };

  this.matches = function(index) {
    if (this.isBlank()) {
      return true;
    } else {
      var matches = true;
      if (this.hide_special) {
        matches = !index.special;
      }
      if (matches && notEmpty(this.state)) {
        if (this.state == 'unhealthy' && !index.unhealthy) {
          matches = false;
        } else {
          var open = this.state == 'open';
          var closed = this.state == 'close';
          if ((open || closed) && this.state != index.state) {
            matches = false;
          }
        }
      }
      if (matches && notEmpty(this.name)) {
        try {
          var reg = new RegExp(this.name.trim(), 'i');
          matches = reg.test(index.name);
        }
        catch (err) { // if not valid regexp, still try normal matching
          matches = index.name.indexOf(this.name.toLowerCase()) != -1;
        }
      }
      return matches;
    }
  };

}
