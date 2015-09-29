(function(kopf, JSONTree) {
  "use strict";
  kopf.directive('kopfJsonTree',function() {
    var directive = {
      restrict: 'E',
      template:'<div class="json-tree"></div>',
      link: function(scope, element, attrs, requires){
        var scopeAttr = attrs.kopfBind;
        if(scopeAttr) {
          scope.$watch(scopeAttr, function(value) {
            if (value) {
              try {
                value = JSONTree.create(value);
              } catch (invalidJsonError) {
                value = invalidJsonError;
              }
            } else {
              value = '';
            }
            element.html(value);
          });
        }
      }
    };
    return directive;
  });
})(kopf, JSONTree);
