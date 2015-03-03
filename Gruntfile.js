/*jshint node:true*/
'use strict';

module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        jshint: {
            gruntfile: {
                src: 'Gruntfile.js'
            },
            lib: {
                src: ['index.js']
            },
            test: {
                src: ['test/*.js']
            }
        },
        mochaTest: {
            test: {
                options: {
                    reporter: 'spec',
                    quiet: false,
                    clearRequireCache: false,
                    require: 'coverage/blanket'
                },
                src: ['test/*.js']
            },
            coverage: {
                options: {
                    reporter: 'travis-cov',
                    quiet: false
                },
                src: ['test/*.js']
            }
        }
    });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-test');

    // Default task.
    grunt.registerTask('test', ['jshint', 'mochaTest']);

};
