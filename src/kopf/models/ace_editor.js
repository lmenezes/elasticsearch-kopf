function AceEditor(target) {
	// ace editor
	this.editor = ace.edit(target);
	this.editor.setFontSize("10px");
	this.editor.setTheme("ace/theme/kopf");
	this.editor.getSession().setMode("ace/mode/json");
	
	// validation error
	this.error = null;
	
	// sets value and moves cursor to beggining
	this.setValue=function(value) {
		this.editor.setValue(value,1);
		this.editor.gotoLine(0,0,false);
	};
	
	this.getValue=function() {
		return this.editor.getValue();
	};
	
	// formats the json content
	this.format=function() {
		var content = this.editor.getValue();
		try {
			if (isDefined(content) && content.trim().length > 0) {
				this.error = null;
				content = JSON.stringify(JSON.parse(content),undefined,4);
				this.editor.setValue(content,0);
				this.editor.gotoLine(0,0,false);
			}
		} catch (error) {
			this.error = error.toString();
		}
		return content;
	};
}