kopf.directive('ngPagination', function() {
  return {
    scope: {
      paginator: '=paginator',
      page: '=page'
    },
    templateUrl: './partials/pagination.html'
  };
});
