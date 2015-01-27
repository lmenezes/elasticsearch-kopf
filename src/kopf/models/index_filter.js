function IndexFilter(name, closed, special, asc, timestamp) {
  this.name = name;
  this.closed = closed;
  this.special = special;
  this.sort = 'name';
  this.asc = asc;
  this.timestamp = timestamp;

  this.getSorting = function() {
    var asc = this.asc;
    switch (this.sort) {
      case 'name':
        return function(a, b) {
          if (asc) {
            return a.name.localeCompare(b.name);
          } else {
            return b.name.localeCompare(a.name);
          }
        };
      default:
        return undefined;
    }
  };

  this.clone = function() {
    return new IndexFilter(
        this.name, this.closed, this.special, this.asc, this.timestamp
    );
  };

  this.equals = function(other) {
    return (
    other !== null &&
    this.name === other.name &&
    this.closed === other.closed &&
    this.special === other.special &&
    this.asc === other.asc &&
    this.timestamp === other.timestamp
    );
  };

  this.isBlank = function() {
    return !notEmpty(this.name) && this.closed && this.special && this.asc;
  };

  this.matches = function(index) {
    var matches = true;
    if (!this.special && index.special) {
      matches = false;
    }
    if (!this.closed && index.closed) {
      matches = false;
    }
    if (matches && notEmpty(this.name)) {
      try {
        matches = new RegExp(this.name.trim(), 'i').test(index.name);
      }
      catch (err) { // if not valid regexp, still try normal matching
        matches = index.name.indexOf(this.name.toLowerCase()) != -1;
      }
    }
    return matches;
  };

}
