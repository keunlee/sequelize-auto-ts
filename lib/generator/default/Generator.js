'use strict';
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var fs = require("fs");
var path = require("path");
var BaseGenerator_1 = require("./../BaseGenerator");
var ScriptTemplate = require("script-template");
var Generator = (function (_super) {
    __extends(Generator, _super);
    function Generator() {
        _super.apply(this, arguments);
    }
    Generator.prototype.generateTypes = function (options, schema, callback) {
        if (!this.init(options, schema, callback))
            return;
        var self = this;
        self.generateFromTemplate(options, schema, "templates/sequelize-types.ts.tpl", function (err) {
            self.generateFromTemplate(options, schema, "templates/sequelize-names.ts.tpl", function (err) {
                var template = options.modelFactory ? "templates/sequelize-model-factory.ts.tpl" : "templates/sequelize-models.ts.tpl";
                self.generateFromTemplate(options, schema, template, callback);
            });
        });
    };
    Generator.prototype.generateFromTemplate = function (options, schema, templateName, callback) {
        console.log("Generating " + templateName);
        var templateText = fs.readFileSync(path.join(__dirname, templateName), "utf8");
        var engine = new ScriptTemplate(templateText);
        var genText = engine.run(schema);
        genText = this.translateReferences(genText, options);
        var baseName = path.basename(templateName, ".tpl");
        fs.writeFileSync(path.join(options.targetDirectory, baseName), genText);
        callback(null);
    };
    return Generator;
}(BaseGenerator_1.BaseGenerator));
exports.Generator = Generator;
//# sourceMappingURL=Generator.js.map