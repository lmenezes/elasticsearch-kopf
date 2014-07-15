function IndexFilter(name, state, hide_special, timestamp) {
    this.name = name;
    this.state = state;
    this.hide_special = hide_special;
    this.timestamp = timestamp;

    this.clone=function() {
        return new IndexFilter(this.name, this.state, this.hide_special, this.timestamp);
    };

    this.equals=function(other) {
        return (
            other !== null &&
            this.name == other.name &&
            this.state == other.state &&
            this.hide_special === other.hide_special &&
            this.timestamp == other.timestamp
        );
    };

    this.isBlank=function() {
        return !notEmpty(this.name) && !notEmpty(this.state) && !notEmpty(this.hide_special);
    };

    this.matches=function(index) {
        if (this.isBlank()) {
            return true;
        } else {
            var matches = true;
            if (notEmpty(this.name) && index.name.indexOf(this.name) == -1) {
                matches = false;
            }
            if (matches && notEmpty(this.state)) {
                if (this.state == "unhealthy" && !index.unhealthy) {
                        matches = false;
                } else if ((this.state == "open" || this.state == "close") && this.state != index.state) {
                    matches = false;
                }
            }
            if (matches && this.hide_special) {
                matches = !index.isSpecial();
            }
            return matches;
        }
    };

}