function AceEditor(target) {
  var self = this;
  var getFontSize = function() {
    return localStorage['kopf:' + target + ':font-size'] + 'px' || '10px';
  };

  // ace editor
  ace.config.set('basePath', 'dist/');
  this.editor = ace.edit(target);
  this.editor.setFontSize(getFontSize());
  this.editor.setTheme('ace/theme/kopf');
  this.editor.getSession().setMode('ace/mode/json');

  // validation error
  this.error = null;

  // sets value and moves cursor to beggining
  this.setValue = function(value) {
    this.editor.setValue(value, 1);
    this.editor.gotoLine(0, 0, false);
  };

  this.getValue = function() {
    return this.editor.getValue();
  };

  // formats the json content
  this.format = function() {
    var content = this.editor.getValue();
    try {
      if (isDefined(content) && content.trim().length > 0) {
        this.error = null;
        content = JSON.stringify(JSON.parse(content), undefined, 2);
        this.editor.setValue(content, 0);
        this.editor.gotoLine(0, 0, false);
      }
    } catch (error) {
      this.error = error.toString();
    }
    return content;
  };

  this.hasContent = function() {
    return this.editor.getValue().trim().length > 0;
  };

  this.setFontSize = function(fontSize) {
    localStorage['kopf:' + target + ':font-size'] = fontSize;
    self.editor.setFontSize(getFontSize());
  };
}
