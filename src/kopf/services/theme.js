kopf.factory('ThemeService', function() {

  this.theme = 'dark';

  this.setTheme = function(theme) {
    this.theme = theme;
    localStorage.kopfTheme = theme;
  };

  this.getTheme = function() {
    if (isDefined(localStorage.kopfTheme)) {
      return localStorage.kopfTheme;
    } else {
      return this.theme;
    }
  };

  return this;
});
