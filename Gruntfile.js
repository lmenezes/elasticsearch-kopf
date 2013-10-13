module.exports = function(grunt) {

	grunt.initConfig({
		clean: {
			dist: {
				src: ['dist']
			}
		},
		copy: {
			main: {
				files: [
				{expand: true, flatten: true, src: ['src/lib/ace/mode-json.js'], dest: 'dist/'},
				{expand: true, flatten: true, src: ['src/lib/ace/worker-json.js'], dest: 'dist/'},
				{expand: true, flatten: true, src: ['src/kopf/theme-kopf.js'], dest: 'dist/'}
				]
			}
		},
		concat: {
			vendorjs: {
				src: [
					'src/lib/jquery/jquery-1.10.2.min.js',
					'src/lib/angularjs/angular.min.js',
					'src/lib/ace/ace.js',
					'src/lib/jsontree/jsontree.min.js',
					'src/lib/bootstrap/js/bootstrap.js'
				],
				dest: 'dist/lib.js'
			},
			vendorcss: {
				src: [
					'src/lib/bootstrap/css/bootstrap.css'
				],
				dest: 'dist/lib.css'
			},
			appjs: {
				src: [
					'src/kopf/controllers.js',
					'src/kopf/elastic_client.js',
					'src/kopf/theme-kopf.js' // for ace.js
				],
				dest: 'dist/kopf.js'
			},
			appcss: {
				src: [
					'src/kopf/kopf.css',
				],
				dest: 'dist/kopf.css'
			},
			
		},
		connect: {
			server: {
				options: {
					port: 9000,
					base: '.',
					keepalive: true
				}
			}
		}
	});
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-connect');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.registerTask('build', ['clean', 'copy', 'concat']);
	grunt.registerTask('server', ['clean', 'copy', 'concat','connect:server']);

};
