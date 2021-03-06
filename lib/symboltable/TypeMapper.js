'use strict';
var TypeMapper = (function () {
    function TypeMapper() {
    }
    TypeMapper.init = function (dialect) {
        TypeMapper.fieldTypeTranslations = {};
        TypeMapper.fieldTypeTranslations = JSON.parse(JSON.stringify(TypeMapper.fieldTypeTranslationsInternal));
        TypeMapper.fieldTypeSequelize = {};
        TypeMapper.fieldTypeSequelize = JSON.parse(JSON.stringify(TypeMapper.fieldTypeSequelizeInternal));
        switch (dialect) {
            case 'mssql':
                TypeMapper.fieldTypeTranslations["bit"] = "boolean";
                TypeMapper.fieldTypeSequelize["bit"] = "Sequelize.BOOLEAN";
                break;
        }
    };
    TypeMapper.fieldTypeTranslations = {};
    TypeMapper.fieldTypeSequelize = {};
    TypeMapper.fieldTypeTranslationsInternal = {
        tinyint: "boolean",
        boolean: "boolean",
        smallint: "number",
        int: "number",
        integer: "number",
        mediumint: "number",
        bigint: "number",
        year: "number",
        float: "number",
        double: "number",
        decimal: "number",
        "double precision": "number",
        real: "number",
        numeric: "number",
        money: "number",
        timestamp: "Date",
        date: "Date",
        datetime: "Date",
        datetime2: "Date",
        tinyblob: "Buffer",
        mediumblob: "Buffer",
        longblob: "Buffer",
        blob: "Buffer",
        image: "Buffer",
        binary: "Buffer",
        varbinary: "Buffer",
        bit: "Buffer",
        bytea: "Buffer",
        char: "string",
        nchar: "string",
        character: "string",
        varchar: "string",
        nvarchar: "string",
        tinytext: "string",
        mediumtext: "string",
        longtext: "string",
        text: "string",
        ntext: "string",
        "enum": "string",
        "set": "string",
        time: "string",
        geometry: "string",
        "character varying": "string",
        "USER-DEFINED": "string",
        "uniqueidentifier": "string"
    };
    TypeMapper.fieldTypeSequelizeInternal = {
        tinyint: 'Sequelize.BOOLEAN',
        boolean: 'Sequelize.BOOLEAN',
        smallint: 'Sequelize.INTEGER',
        int: 'Sequelize.INTEGER',
        integer: 'Sequelize.INTEGER',
        mediumint: 'Sequelize.INTEGER',
        bigint: 'Sequelize.INTEGER',
        year: 'Sequelize.INTEGER',
        float: 'Sequelize.DECIMAL',
        double: 'Sequelize.DECIMAL',
        decimal: 'Sequelize.DECIMAL',
        "double precision": 'Sequelize.DECIMAL',
        real: 'Sequelize.DECIMAL',
        numeric: 'Sequelize.DECIMAL',
        money: 'Sequelize.DECIMAL',
        timestamp: 'Sequelize.DATE',
        date: 'Sequelize.DATE',
        datetime: 'Sequelize.DATE',
        datetime2: 'Sequelize.DATE',
        tinyblob: 'Sequelize.BLOB',
        mediumblob: 'Sequelize.BLOB',
        longblob: 'Sequelize.BLOB',
        blob: 'Sequelize.BLOB',
        image: 'Sequelize.BLOB',
        binary: 'Sequelize.BLOB',
        varbinary: 'Sequelize.BLOB',
        bit: 'Sequelize.BLOB',
        bytea: 'Sequelize.BLOB',
        char: 'Sequelize.STRING',
        nchar: 'Sequelize.STRING',
        varchar: 'Sequelize.STRING',
        nvarchar: 'Sequelize.STRING',
        tinytext: 'Sequelize.STRING',
        mediumtext: 'Sequelize.STRING',
        longtext: 'Sequelize.STRING',
        text: 'Sequelize.STRING',
        ntext: 'Sequelize.STRING',
        "enum": 'Sequelize.ENUM',
        "set": 'Sequelize.STRING',
        time: 'Sequelize.STRING',
        geometry: 'Sequelize.STRING',
        "character varying": 'Sequelize.STRING',
        character: 'Sequelize.STRING',
        "USER-DEFINED": 'Sequelize.STRING',
        uniqueidentifier: 'Sequelize.UUID'
    };
    return TypeMapper;
}());
exports.TypeMapper = TypeMapper;
//# sourceMappingURL=TypeMapper.js.map