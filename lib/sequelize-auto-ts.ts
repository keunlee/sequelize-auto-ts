/// <reference path="../typings/index.d.ts"/>
'use strict';

import path = require("path");
import fs = require("fs");
import api = require("./api");
import schema = require("./schema");

export function generate(options : api.IGenerateOptions, callback? : (err : Error) => void) : void {
    var generator: api.IGenerator = null;
    var generatorPath = options.generatorPath;
    var generatorName = options.generatorName;

    if (callback == undefined) {
        callback = function (err : Error) : void {
        };
    }

    if (isNullOrWhiteSpace(options.generatorPath)) {
        generatorPath = path.join(__dirname, 'generator');
    }

    if (isNullOrWhiteSpace(options.generatorName)) {
        generatorName = "default";
    }

    try {
        var generatorFullPath = path.join(path.join(generatorPath, generatorName), 'Generator.js');
        if (!fs.existsSync(generatorFullPath)) {
            generatorPath = "./"; // from the callers directory
            generatorFullPath = path.join(path.join(generatorPath, generatorName), 'Generator.js');
        }
        var gen = require(generatorFullPath);
        generator = new gen.Generator();
    } catch (err) {
        callback(err);
    }

    schema.read(options.database, options.username, options.password, options.options, options.naming,
        function (err : Error, schema : api.ISchema) {
            if (err) {
                callback(err);
                return;
            }
            schema.useModelFactory = options.modelFactory;
            generator.generateTypes(options, schema, callback);
        });
}

function isNullOrWhiteSpace(str){
    return str == null || str.replace(/\s/g, '').length < 1;
}