function ClusterChanges() {

	this.nodeJoins = null;
	this.nodeLeaves = null;

	this.hasChanges=function() {
		return (this.nodeJoins != null ||
			this.nodeLeaves != null
		);
	}

	this.addJoiningNode=function(node) {
		this.changes = true;
		if (this.nodeJoins == null) {
			this.nodeJoins = [];
		}
		this.nodeJoins.push(node);
	}

	this.addLeavingNode=function(node) {
		this.changes = true;
		if (this.nodeLeaves == null) {
			this.nodeLeaves = [];
		}
		this.nodeLeaves.push(node);
	}

	this.hasJoins=function() {
		return this.nodeJoins != null;
	}

	this.hasLeaves=function() {
		return this.nodeLeaves != null;
	}

}