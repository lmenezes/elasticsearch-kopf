var kopf = angular.module('kopf', []);
kopf.factory('IndexSettingsService', function() {
	return {index: null};
});
kopf.factory('ClusterSettingsService', function() {
	return {cluster: null};
});