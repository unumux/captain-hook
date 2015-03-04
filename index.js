/*jshint node:true */
/*global beforeEach, afterEach, describe, expect, it, spyOn, xdescribe, xit */
'use strict';

var path = require("path");
var _ = require("lodash");
var fs = require("fs");

var injectionTemplates = {
    css: '<link rel="stylesheet" type="text/css" href="<%= file %>">',
    js: '<script src="<%= file %>"></script>',
    scss: '@import "<%= file %>";'
};

var commentStyles = {
    html: "<!-- <%= marker %>:<%= type %> -->",
    scss: "// <%= marker %>:<%= type %>"
};

var defaults = {
    templateType: "html",
    commentStyle: ""
};


/**
 * Creates a new CaptainHook instance
 * @class CaptainHook
 *
 * @param  {string} template Template with comment tags used for injection
 * @param  {string} [templateType="html"] Template type
 * @param  {object} customInjectionTemplates Custom injection templates
 * @return {CaptainHook} Instance of CaptainHook
 */
function CaptainHook(template, templateType, customInjectionTemplates) {

    this.template = template;
    this.templateType = templateType || "html";
    this.commentStyle = commentStyles[this.templateType];

    if(customInjectionTemplates) {
        this.injectionTemplates = _.defaults(customInjectionTemplates, injectionTemplates);
    } else {
        this.injectionTemplates = injectionTemplates;
    }

}


/**
 * CaptainHook.prototype.inject - Inject a group of files into the instance's template
 * @memberof CaptainHook#
 *
 * @param  {string} blockID        ID of the comment block to inject into
 * @param  {string[]} injections   Array of lines to inject
 * @param  {string} injectTemplate Template used for each injected line
 * @return {string}              Instance's template
 */
CaptainHook.prototype.inject = function (blockID, injections, injectTemplate) {
    this.commentTags = this.generateCommentTags(blockID);

    var originalTags = this.getBlockContents(this.commentTags);

    // if comment block cannot be found, don't continue and return the current template
    if(originalTags === false) {
        return this.template;
    }

    var indexes = this.getBlockIndexes(this.commentTags);

    var indentation = this.template.substring(this.template.substring(0, indexes.begin).lastIndexOf('\n'), indexes.begin);

    /* create a new line before the indentation, in case one does not exist (like at the start of the file) */
    if(indentation.indexOf("\n") < 0) {
        indentation = "\n" + indentation;
    }

    var toInject = injections.map(function(file) {
        return this.createTag(file);
    }.bind(this));

    var newInject = _.union(originalTags, toInject);
    _.remove(newInject, function(n) {
        return toInject.indexOf(n) < 0;
    });

    newInject.unshift(this.commentTags.begin);
    newInject.push(this.commentTags.end);


    var newTemplate = this.template.substring(0, indexes.begin);
    newTemplate += newInject.join(indentation);
    newTemplate += this.template.substr(indexes.end);
    this.template = newTemplate;
    return this.template;

};


/**
 * CaptainHook.prototype.createTag - Create injectable string based on template type and file extension
 * @memberof CaptainHook#
 *
 * @param {string}  file    File to create tag for
 * @return {string}  Created tag
 */
CaptainHook.prototype.createTag = function (file) {
    var extname = path.extname(file).substr(1);
    var injectionTemplate = _.template(this.injectionTemplates[extname]);

    return injectionTemplate({ file: file });
};


/**
 * CaptainHook.prototype.getBlockContents - Get all contents of a comment block
 *
 * @param  {type} commentTags description
 * @return {type}             description
 */
CaptainHook.prototype.getBlockContents = function(commentTags) {
    var indexes = this.getBlockIndexes(commentTags);

    if(!indexes) {
        return false;
    }

    var contents = this.template.substring(indexes.begin + commentTags.begin.length, indexes.end - commentTags.end.length).split(/\s*\n\s*/);
    // remove empty strings from the content array
    contents = _.remove(contents, function(n) {
        return n.length > 0;
    });

    return contents;
};


/**
 * CaptainHook.prototype.getBlockIndexes - Get indexes in template of beginning and ending comments
 *
 * @param  {type} commentTags description
 * @return {type}             description
 */
CaptainHook.prototype.getBlockIndexes = function(commentTags) {
    var beginIndex = this.template.indexOf(commentTags.begin);

    if(beginIndex < 0) {
        return false;
    }

    var endIndex = this.template.indexOf(commentTags.end) + commentTags.end.length;

    return { begin: beginIndex, end: endIndex };
};


/**
 * CaptainHook.prototype.generateCommentTags - Generate comment tags based on template style and a blockID
 *
 * @param  {type} blockID description
 * @return {type}         description
 */
CaptainHook.prototype.generateCommentTags = function(blockID) {
    var compile = _.template(this.commentStyle);
    return {
        begin: compile({ marker: 'begin', type: blockID }),
        end: compile({ marker: 'end', type: blockID })
    };
};

module.exports = CaptainHook;
