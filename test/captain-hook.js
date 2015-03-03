/*jshint node:true */
/*global beforeEach, afterEach, describe, it, spyOn, xdescribe, xit */
'use strict';

var fs = require('fs'),
    path = require('path'),
    expect = require("chai").expect,
    CaptainHook = require('../index.js');

function loadFiles(dir) {
    var filenames = fs.readdirSync(dir),
        returnObj = {};

    filenames.forEach(function (file) {
        var filename = path.basename(file, path.extname(file));
        returnObj[filename] = fs.readFileSync(path.join(dir, file), {encoding: 'utf8'});
    });

    return returnObj;
}

var fixtures = loadFiles(__dirname + '/fixtures');
var expected = loadFiles(__dirname + '/expected');


describe("CaptainHook()", function () {
    var chInstance;
    var basicWithExisting;
    var append;
    var emptyScss;

    beforeEach(function () {
        chInstance = new CaptainHook(fixtures.basic);
        basicWithExisting = new CaptainHook(fixtures.basicWithExisting);
        append = new CaptainHook(fixtures.append);
        emptyScss = new CaptainHook(fixtures.emptyScss, 'scss');
    });

    it("should be instantiable and accept a template", function () {
        expect(chInstance).to.be.an.instanceOf(CaptainHook);
    });

    it("should have a template property that matches the value of the template it was instantiated with", function () {
        expect(chInstance).to.have.ownProperty('template');
        expect(chInstance.template).to.equal(fixtures.basic);
    });

    it("should use 'html' as the default template type", function () {
        expect(chInstance).to.have.ownProperty('templateType');
        expect(chInstance).to.have.ownProperty('commentStyle');
        expect(chInstance.templateType).to.equal("html");
        expect(chInstance.commentStyle).to.equal("<!-- <%= marker %>:<%= type %> -->");
    });

    it("should support scss as a template type", function () {
        var thisInstance = new CaptainHook(fixtures.basic, 'scss');
        expect(thisInstance).to.have.ownProperty('templateType');
        expect(thisInstance).to.have.ownProperty('commentStyle');
        expect(thisInstance.templateType).to.equal("scss");
        expect(thisInstance.commentStyle).to.equal("// <%= marker %>:<%= type %>");
    });

    describe("inject()", function () {

        it("should have an inject function", function () {
            expect(chInstance).to.respondTo('inject');
        });

        it("should inject js and css references", function () {
            var result;
            chInstance.inject('js', ['site1.js', 'site2.js']);
            result = chInstance.inject('css', ['site.css']);
            expect(result).to.equal(expected.basic);
        });

        it("should not reinject existing references", function () {
            var result;
            basicWithExisting.inject('js', ['site3.js', 'site4.js']);
            result = basicWithExisting.inject('css', ['site.css']);
            expect(result).to.equal(fixtures.basicWithExisting);
        });

        it("should append new references after existing references", function () {
            var result;
            append.inject('js', ['site1.js', 'site2.js', 'site3.js']);
            result = append.inject('css', ['site.css']);
            expect(result).to.equal(expected.append);
        });

        it("should remove references that are no longer in the injection array", function () {
            var result;
            append.inject('js', ['site1.js', 'site2.js']);
            result = append.inject('css', ['site.css']);
            expect(result).to.equal(expected.basic);
        });

        it("should work with scss files", function () {
            var result;
            emptyScss.inject('scss', ['_partial1.scss', '_partial2.scss', '_partial3.scss']);
            expect(emptyScss.template).to.equal(expected.emptyScss);
        });

    });

    describe("createTag()", function () {

        it("should create a tag based on extension", function () {
            var jsTag = chInstance.createTag('site1.js'),
                cssTag = chInstance.createTag('site.css');

            expect(jsTag).to.equal('<script src="site1.js"></script>');
            expect(cssTag).to.equal('<link rel="stylesheet" type="text/css" href="site.css">');
        });

        it("should create a tag based on template type", function () {
            var thisInstance = new CaptainHook("", "scss");

            var scssTag = thisInstance.createTag('partial.scss');

            expect(scssTag).to.equal('@import "partial.scss";');
        });

        it("should create a tag when CaptainHook is instantiated with a custom template type", function() {
            var thisInstance = new CaptainHook("", "html", { "jpg": "<img src='<%= file %>'>" });
            var imgTag = thisInstance.createTag('image.jpg');

            expect(imgTag).to.equal("<img src='image.jpg'>");
        });

    });

    describe("getBlockContents()", function () {

        it("should return an accurate block", function () {
            var result = basicWithExisting.getBlockContents({ begin: "<!-- begin:js -->", end: "<!-- end:js -->" });

            expect(result).to.deep.equal(['<script src="site3.js"></script>', '<script src="site4.js"></script>']);
        });

        it("should return an empty array if the block is empty", function () {
            var result = chInstance.getBlockContents({ begin: "<!-- begin:js -->", end: "<!-- end:js -->" });

            expect(result).to.have.length(0);
        });

        it("should return false if the comment tag could not be found", function () {
            var result = chInstance.getBlockContents({ begin: "<!-- begin:jsx -->", end: "<!-- end:jsx -->" });
            expect(result).to.equal(false);
        });

        it("should work even if indentation is not consistent", function () {
            var thisInstance = new CaptainHook(fixtures.basicIndentationTest);

            var result = thisInstance.getBlockContents({ begin: "<!-- begin:js -->", end: "<!-- end:js -->" });
            expect(result).to.deep.equal(['<script src="test1.js"></script>', '<script src="test2.js"></script>', '<script src="test3.js"></script>']);
        });

        it("should work if the comment tag is the first line of the page", function () {
            var thisInstance = new CaptainHook(fixtures.basicFirstLine);
            var result = thisInstance.getBlockContents({ begin: "// begin:scss", end: "// end:scss" });
            expect(result).to.deep.equal(['@import "test1.scss";']);
        });

    });

    describe("generateCommentTags()", function () {

        it('should create comment tags with the default template type', function () {
            var result = chInstance.generateCommentTags('js');
            expect(result).to.deep.equal({ begin: "<!-- begin:js -->", end: "<!-- end:js -->" });
        });

        it('should generate comment tags when a different template type was instantiated', function () {
            var thisInstance = new CaptainHook(fixtures.basicFirstLine, 'scss');
            var result = thisInstance.generateCommentTags('scss');
            expect(result).to.deep.equal({ begin: "// begin:scss", end: "// end:scss" });
        });

    });

});
