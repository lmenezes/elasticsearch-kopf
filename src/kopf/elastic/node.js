function Node(node_id, node_info, node_stats) {
	this.id = node_id;	
	this.name = node_info.name;
	this.metadata = {};
	this.metadata.info = node_info;
	this.metadata.stats = node_stats;
	this.transport_address = node_info.transport_address;
	var master = node_info.attributes.master === 'false' ? false : true;
	var data = node_info.attributes.data === 'false' ? false : true;
	var client = node_info.attributes.client === 'true' ? true : false;
	this.master =  master && !client;
	this.data = data && !client;
	this.client = client || !master && !data;
	this.current_master = false;
	this.stats = node_stats;

	this.setCurrentMaster=function() {
		this.current_master = true;
	};

	this.equals=function(node) {
		return node.id === this.id;
	};
	
	this.compare=function(other) { // TODO: take into account node specs?
		if (other.current_master) {
			return 1;
		}
		if (this.current_master) {
			return -1;
		}
		if (other.master && !this.master) {
			return 1;
		} 
		if (this.master && !other.master) {
			return -1;
		}

		if (other.data && !this.data) {
			return 1;
		} 
		if (this.data && !other.data) {
			return -1;
		}
		return this.name.localeCompare(other.name);
	};
}