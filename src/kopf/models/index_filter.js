function IndexFilter(name, closed, special, timestamp) {
  this.name = name;
  this.closed = closed;
  this.special = special;
  this.timestamp = timestamp;

  this.clone = function() {
    return new IndexFilter(
        this.name, this.closed, this.special, this.timestamp
    );
  };

  this.equals = function(other) {
    return (
    other !== null &&
    this.name === other.name &&
    this.closed === other.closed &&
    this.special === other.special &&
    this.timestamp === other.timestamp
    );
  };

  this.isBlank = function() {
    return !notEmpty(this.name) && this.closed && this.special;
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
