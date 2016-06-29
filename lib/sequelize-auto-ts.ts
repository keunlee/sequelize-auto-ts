/// <reference path="../typings/index.d.ts"/>

import sequelize = require('sequelize');
import schema = require("./schema");
import path = require("path");
var ScriptTemplate = require("script-template");
import fs = require("fs");
import _ = require("lodash");

var Sequelize : sequelize.SequelizeStatic = require("sequelize");

var targetProjectRootDirectory : string = null;

export interface GenerateOptions {
    database : string;
    username : string;
    password : string;
    options : sequelize.Options;
    naming : any;
    modelFactory? : boolean;

    targetDirectory : string;
}
export function generate(options : GenerateOptions, callback? : (err : Error) => void) : void {
    if (callback == undefined) {
        callback = function (err : Error) : void {
        };
    }

    schema.read(options.database, options.username, options.password, options.options, options.naming,
        function (err : Error, schema : schema.Schema) {
            if (err) {
                callback(err);
                return;
            }

            generateTypes(options, schema, callback);
        });
}

function generateTypes(options : GenerateOptions, schema : schema.Schema, callback : (err : Error) => void) : void {
    schema.useModelFactory = options.modelFactory;

    generateFromTemplate(options, schema, "generator/default/templates/sequelize-types.ts.tpl", function (err : Error) {
        generateFromTemplate(options, schema, "generator/default/templates/sequelize-names.ts.tpl", function (err : Error) {
            var template : string = options.modelFactory ? "generator/default/templates/sequelize-model-factory.ts.tpl" : "generator/default/templates/sequelize-models.ts.tpl";
            generateFromTemplate(options, schema, template, callback);
        });
    });
}

function generateFromTemplate(options : GenerateOptions, schema : schema.Schema, templateName : string, callback : (err : Error) => void) : void {
    console.log("Generating " + templateName);

    var templateText : string = fs.readFileSync(path.join(__dirname, templateName), "utf8");

    var engine = new ScriptTemplate(templateText);
    var genText : string = engine.run(schema);

    genText = translateReferences(genText, options);

    var baseName = path.basename(templateName, ".tpl");
    fs.writeFileSync(path.join(options.targetDirectory, baseName), genText);

    callback(null);
}

function translateReferences(source : string, options : GenerateOptions) : string {
    var re : RegExp = new RegExp("///\\s+<reference\\s+path=[\"'][\\./\\w\\-\\d]+?([\\w\\.\\-]+)[\"']\\s*/>", "g");

    function replaceFileName(match : string, fileName : string) : string {
        if (targetProjectRootDirectory == null) {
            targetProjectRootDirectory = findTargetProjectRootDirectory(options);
        }

        var targetPath : string = findTargetPath(fileName, targetProjectRootDirectory);

        var relativePath : string = targetPath == null
            ? null
            : path.relative(options.targetDirectory, targetPath);

        if (relativePath == null) {
            var sourceText : string = fs.readFileSync(path.join(__dirname, fileName), "utf8");
            var targetText = translateReferences(sourceText, options);
            fs.writeFileSync(path.join(options.targetDirectory, fileName), targetText);

            relativePath = "./" + fileName;
        }
        else if (relativePath.charAt(0) != ".") {
            relativePath = "./" + relativePath;
        }
        return "/// <reference path=\"" + relativePath.replace(/\\/g, '/') + "\" />";
    }

    return source.replace(re, replaceFileName);
}

function findTargetProjectRootDirectory(options : GenerateOptions) : string {
    var dir : string = options.targetDirectory;

    while (!hasFile(dir, "package.json")) {
        var parent : string = path.resolve(dir, "..");
        if (parent == null || parent == dir) {
            // found root without finding a package.json file
            return options.targetDirectory;
        }
        dir = parent;
    }

    return dir;
}

function hasFile(directory : string, file : string) : boolean {
    var files : string[] = fs.readdirSync(directory);
    return _.contains(files, file);
}

function findTargetPath(fileName : string, searchDirectory : string) : string {
    var target : string = path.join(searchDirectory, fileName);
    if (fs.existsSync(target)) {
        return target;
    }

    var childDirectories : string[] = fs.readdirSync(searchDirectory);
    for (var i = 0; i < childDirectories.length; i++) {
        var childName : string = childDirectories[i];
        var childPath : string = path.join(searchDirectory, childName);

        var stat : fs.Stats = fs.statSync(childPath);

        if (stat.isDirectory() && childName.charAt(0) != '.' && childName != 'node_modules') {
            target = findTargetPath(fileName, childPath);
            if (target != null) {
                return target;
            }
        }
    }
    return null;
}
