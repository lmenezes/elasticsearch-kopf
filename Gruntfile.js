module.exports = function(grunt) {

	grunt.initConfig({
		clean: {
			dist: {
				src: ['dist']
			}
		},
		watch: {
		  scripts: {
		    files: ['src/kopf/**/*.*','src/kopf/*.*'],
		    tasks: ['build'],
		    options: {
		      spawn: false,
		    },
		  },
		},
		copy: {
			main: {
				files: [
				{expand: true, flatten: true, src: ['src/lib/ace/mode-json.js'], dest: './'},
				{expand: true, flatten: true, src: ['src/lib/ace/worker-json.js'], dest: './'},
				{expand: true, flatten: true, src: ['src/kopf/theme-kopf.js'], dest: './'}
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
					'src/kopf/elastic_client.js',
					'src/kopf/controllers.js',
					'src/kopf/kopf.js',
					'src/kopf/controllers/aliases.js',
					'src/kopf/controllers/analysis.js',
					'src/kopf/controllers/cluster_health.js',
					'src/kopf/controllers/cluster_overview.js',
					'src/kopf/controllers/cluster_settings.js',
					'src/kopf/controllers/create_index.js',
					'src/kopf/controllers/global.js',
					'src/kopf/controllers/index_settings.js',
					'src/kopf/controllers/navbar.js',
					'src/kopf/controllers/rest.js',
					'src/kopf/controllers/percolator.js',
					'src/kopf/controllers/confirm_dialog.js',
					'src/kopf/controllers/warmup.js',
				],
				dest: 'dist/kopf.js'
			},
			appcss: {
				src: [
					'src/kopf/kopf.css',
					'src/kopf/css/percolator.css',
					'src/kopf/css/common.css',
					'src/kopf/css/index_settings.css',
					'src/kopf/css/aliases.css',
					'src/kopf/css/analysis.css',
					'src/kopf/css/cluster_health.css',
					'src/kopf/css/cluster_overview.css',
					'src/kopf/css/gist_share.css',
					'src/kopf/css/json_tree.css',
					'src/kopf/css/navbar.css',
					'src/kopf/css/rest_client.css',
					'src/kopf/css/warmup.css'
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
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.registerTask('build', ['clean', 'copy', 'concat']);
	grunt.registerTask('server', ['clean', 'copy', 'concat','connect:server']);

};
