/****************************
 *
 * Loads and exposes schema from database
 */

/// <reference path="../typings/index.d.ts"/>

import util = require('./util');

import sequelize = require('sequelize');
var Sequelize : sequelize.SequelizeStatic = require("sequelize");
import fs = require('fs');
import _ = require('lodash');
import ChangeCase = require('change-case');

const DEFAULT_CASE_TYPE = 'pascalCase';
var naming : any;

export class Schema {

    public static idSuffix : string = "id"; // NOTE: Must be LOWER case

    public references : Reference[] = [];
    public xrefs : Xref[] = [];
    public associations : Association[] = [];
    public calculatedFields : Array<Field> = [];
    public views : Table[] = [];
    public idFields : Field[] = [];
    public idFieldLookup : util.Dictionary<boolean> = {};

    public useModelFactory : boolean = false;

    constructor(public tables : Array<Table>) {

    }

    public static fieldTypeTranslations : util.Dictionary<string> = {

        tinyint : "boolean",

        smallint : "number",
        int : "number",
        integer : "number",
        mediumint : "number",
        bigint : "number",
        year : "number",
        float : "number",
        double : "number",
        decimal : "number",
        "double precision" : "number",
        real : "number",
        numeric : "number",

        timestamp : "Date",
        date : "Date",
        datetime : "Date",

        tinyblob : "Buffer",
        mediumblob : "Buffer",
        longblob : "Buffer",
        blob : "Buffer",
        binary : "Buffer",
        varbinary : "Buffer",
        bit : "Buffer",
        bytea : "Buffer",

        char : "string",
        character : "string",
        varchar : "string",
        tinytext : "string",
        mediumtext : "string",
        longtext : "string",
        text : "string",
        "enum" : "string",
        "set" : "string",
        time : "string",
        geometry : "string",
        "character varying" : "string",
        "USER-DEFINED" : "string"
    };

    public static fieldTypeSequelize : util.Dictionary<string> = {

        tinyint : 'Sequelize.BOOLEAN',
        smallint : 'Sequelize.INTEGER',
        int : 'Sequelize.INTEGER',
        integer : 'Sequelize.INTEGER',
        mediumint : 'Sequelize.INTEGER',
        bigint : 'Sequelize.INTEGER',
        year : 'Sequelize.INTEGER',

        float : 'Sequelize.DECIMAL',
        double : 'Sequelize.DECIMAL',
        decimal : 'Sequelize.DECIMAL',
        "double precision" : 'Sequelize.DECIMAL',
        real : 'Sequelize.DECIMAL',
        numeric : 'Sequelize.DECIMAL',

        timestamp : 'Sequelize.DATE',
        date : 'Sequelize.DATE',
        datetime : 'Sequelize.DATE',

        tinyblob : 'Sequelize.BLOB',
        mediumblob : 'Sequelize.BLOB',
        longblob : 'Sequelize.BLOB',
        blob : 'Sequelize.BLOB',
        binary : 'Sequelize.BLOB',
        varbinary : 'Sequelize.BLOB',
        bit : 'Sequelize.BLOB',
        bytea : 'Sequelize.BLOB',

        char : 'Sequelize.STRING',
        varchar : 'Sequelize.STRING',
        tinytext : 'Sequelize.STRING',
        mediumtext : 'Sequelize.STRING',
        longtext : 'Sequelize.STRING',
        text : 'Sequelize.STRING',
        "enum" : 'Sequelize.ENUM',
        "set" : 'Sequelize.STRING',
        time : 'Sequelize.STRING',
        geometry : 'Sequelize.STRING',
        "character varying" : 'Sequelize.STRING',
        character : 'Sequelize.STRING',
        "USER-DEFINED" : 'Sequelize.STRING'
    };

    public uniqueReferences() : Reference[] {
        var u : Reference[] = [];

        var foundIds : _.Dictionary<boolean> = {};

        this.references.forEach(addReferenceIfUnique);

        this.tables.forEach(addTablePrimaryKeys);

        return u;

        function addReferenceIfUnique(reference : Reference, index : number, array : Reference[]) : void {
            if (reference.isView || foundIds[reference.foreignKey]) {
                return;
            }

            u.push(reference);

            foundIds[reference.foreignKey] = true;
        }

        function addTablePrimaryKeys(table : Table, index : number, array : Table[]) : void {
            if (table.isView || table.tableName.substr(0, 4) === 'Xref') {
                return;
            }
            var pk : Field = table.fields[0];

            if (foundIds[pk.fieldName]) {
                return;
            }
            foundIds[pk.fieldName] = true;

            var r : Reference = new Reference(table.tableName,
                table.tableName,
                undefined,
                pk.fieldName,
                pk.fieldName,
                false,
                this);
            u.push(r);
        }
    }
}

export class Table {
    fields : Array<Field> = [];
    isView : boolean = false;

    constructor(public schema : Schema, public tableName : string) {

    }

    pojoName() : string {
        var name : string = ChangeCase.snake(this.tableName) + '_pojo';
        return ChangeCase[naming.defaults.caseType](name);
    }

    instanceTypeName() : string {
        var name : string = ChangeCase.snake(this.tableName) + '_instance';
        return ChangeCase[naming.defaults.caseType](name);
    }

    modelTypeName() : string {
        var name : string = ChangeCase.snake(this.tableName) + '_model';
        return ChangeCase[naming.defaults.caseType](name);
    }

    assertValidMethodName() : string {
        var name : string = 'assert_valid_' + ChangeCase.snake(this.tableName);
        var type : string = _.has(naming, 'naming.methodName') ? naming.methodName.caseType : naming.defaults.caseType;
        return ChangeCase[type](name);
    }

    getterName() : string {
        var name : string = 'get_' + ChangeCase.snake(this.tableName);
        var type : string = _.has(naming, 'getterName.caseType') ? naming.getterName.caseType : naming.defaults.caseType;
        return ChangeCase[type](name);
    }

    public tableNameSingular() : string {
        return Sequelize.Utils.singularize(this.tableName);
    }

    public tableNameSingularCamel() : string {
        return toCamelCase(this.tableNameSingular());
    }

    public tableNamePascal() : string {
        return ChangeCase.pascal(this.tableName);
    }

    public tableNameCamel() : string {
        return ChangeCase.camel(this.tableName);
    }

    public tableNameModel() : string {
        return this.schema.useModelFactory ? this.tableNameCamel() : this.tableName;
    }

    public realDbFields() : Field[] {
        return this.fields.filter(f => !f.isReference && !f.isCalculated);
    }

    idField() : Field {
        return _.find(this.fields, f => f.isIdField());
    }

    idFieldName() : string {
        var idField : Field = this.idField();
        if (idField === undefined) {
            // console.log('Unable to find ID field for type: ' + this.tableName);
            return '!!cannotFindIdFieldOn' + this.tableName + '!!';
        }
        return idField.fieldName;
    }

    idFieldNameTitleCase() : string {
        var idField : Field = this.idField();
        if (idField === undefined) {
            // console.log('Unable to find ID field for type: ' + this.tableName);
            return '!!cannotFindIdFieldOn' + this.tableName + '!!';
        }
        return idField.fieldNameProperCase();
    }
}

export class Field {
    public targetIdFieldType : string; // if this is a prefixed foreign key, then the name of the non-prefixed key is here

    constructor(public fieldName : string, public fieldType : string, public columnType : string, public columnDefault : string, public isNullableString : string, public table : Table, public isReference : boolean = false, public isCalculated : boolean = false) {
       ;
    }

    isNullable() : boolean {
        return this.isNullableString === 'YES';
    }

    fieldNameAndIsNullable() : string {
        var isNullable : boolean = (
            this.isNullable() ||
            /(_at)|(At)$/.test(this.fieldName) ||
            (!_.isNull(this.columnDefault) && !_.isUndefined(this.columnDefault)) ||
            this.fieldName === 'id' ||
            this.isReference
        );
        return this.fieldName + (isNullable ? '?' : '');
    }

    fieldNameProperCase() : string {
        var fieldName : string = ChangeCase[naming.defaults.caseType](this.fieldName);
        return fieldName;
    }

    translatedFieldType() : string {
        var fieldType : string = this.fieldType;
        var translated : string = Schema.fieldTypeTranslations[fieldType];;

        if (translated == undefined) {
            var fieldTypeLength : number = fieldType.length;
            if (fieldTypeLength < 6 ||
                (   fieldType.substr(fieldTypeLength - 4, 4) !== 'Pojo' &&
                fieldType.substr(fieldTypeLength - 6, 6) !== 'Pojo[]')
            ) {
                console.log('Unable to translate field type:' + fieldType);
            }

            if (fieldType.substr(0, 6) === 'types.') {
                console.log('Removing types prefix from ' + fieldType);
                translated = fieldType.substr(6);
            } else {
                translated = fieldType;
            }
        }
        return translated;
    }

    sequelizeFieldType() : string[] {
        var translated : string = Schema.fieldTypeSequelize[this.fieldType];
        if (translated == undefined) {
            console.log('Unable to sequelize field type:' + this.fieldType);
            translated = this.fieldType;
        }
        if (this.fieldType === 'enum') {
            translated += this.columnType.slice(4).replace(/'/g, '"').replace(/""/g, "'");
        }
        return [`type: ${translated}`];
    }

    isIdField() : boolean {
        return this.targetIdFieldType != undefined || Boolean(this.table.schema.idFieldLookup[this.fieldName]);
    }

    customFieldType() : string {
        if (this.isIdField()) {
            if (this.targetIdFieldType == undefined) {
                return this.fieldNameProperCase();
            } else {
                return this.targetIdFieldType;
            }
        } else if (this.isReference) {
            return this.fieldType;
        } else {
            return this.translatedFieldType();
        }
    }

    defineFieldType() : string {
        var fieldType : string[] = [];
        if (this == this.table.fields[0]) {
            fieldType = [
                'type: Sequelize.INTEGER',
                'primaryKey: true',
                'autoIncrement: true'
            ];
        } else if (this.table.tableName.substr(0, 4) == 'Xref' && this == this.table.fields[1]) {
            fieldType = [
                'type: "number"',
                'primaryKey: true'
            ];
        } else {
            fieldType = this.sequelizeFieldType();
            if (!this.isNullable() && !/(_at)|(At)$/.test(this.fieldName)) {
                fieldType.push('allowNull: false');
            }
            if (!_.isNull(this.columnDefault)) {
                fieldType.push('defaultValue: ' + this.generateDefaultValue());
            }
        }
        return '{' + fieldType.join(', ') + '}';
    }

    private generateDefaultValue() : string {
        var raw = this.columnDefault;
        if (this.fieldType === 'tinyint') {
            raw = (raw === '1') ? 'true' : 'false';
        } else if (_.isString(raw) && !/^[1-9][0-9]*$/.test(raw)) {
            raw = `"${raw}"`;
        }
        return raw;
    }

    public tableNameSingular() : string {
        return this.table.tableNameSingular();
    }

    public tableNameSingularCamel() : string {
        return this.table.tableNameSingularCamel();
    }
}

export class Reference {

    constructor(public primaryTableName : string,
                public foreignTableName : string,
                public associationName : string,
                public primaryKey : string,
                public foreignKey : string,
                public isView : boolean,
                public schema : Schema) {

    }

    public primaryTableModelName() : string {
        var name : string = ChangeCase.snake(this.primaryTableName) + '_model';
        return ChangeCase[naming.defaults.caseType](name);
    }

    public foreignTableModelName() : string {
        var name : string = ChangeCase.snake(this.foreignTableName) + '_model';
        return ChangeCase[naming.defaults.caseType](name);
    }

    public primaryTableNameCamel() : string {
        return toCamelCase(this.primaryTableName);
    }

    public primaryTableNameModel() : string {
        if (!this.schema) {
            return this.primaryTableName
        } else {
            return this.schema.useModelFactory ? this.primaryTableNameCamel() : this.primaryTableName;
        }
    }

    public foreignTableNameCamel() : string {
        return toCamelCase(this.foreignTableName);
    }

    associationNameQuoted() : string {
        return this.associationName
            ? '\'' + this.associationName + '\''
            : undefined;
    }
}

export class Xref {

    constructor(public firstTableName : string,
                public firstFieldName : string,
                public secondTableName : string,
                public secondFieldName : string,
                public xrefTableName : string) {

    }

    public firstTableModelName() : string {
        var name : string = ChangeCase.snake(this.firstTableName) + '_model';
        return ChangeCase[naming.defaults.caseType](name);
    }

    public secondTableModelName() : string {
        var name : string = ChangeCase.snake(this.secondTableName) + '_model';
        return ChangeCase[naming.defaults.caseType](name);
    }

    public firstTableNameCamel() : string {
        return toCamelCase(this.firstTableName);
    }

    public secondTableNameCamel() : string {
        return toCamelCase(this.secondTableName);
    }

}

// Associations are named foreign keys, like OwnerUserID
export class Association {
    constructor(public associationName : string) {
    }
}

interface ColumnDefinitionRow {
    table_name : string;
    column_name : string;
    column_type : string;
    column_default : string;
    data_type : string;
    is_nullable : string;
    ordinal_position : number;
}

interface ReferenceDefinitionRow {
    table_name : string;
    column_name : string;
    referenced_table_name : string;
    referenced_column_name : string;
}

interface CustomFieldDefinitionRow extends ColumnDefinitionRow, ReferenceDefinitionRow {

}

export function read(database : string, username : string, password : string, options : sequelize.Options, namingOptions : any, callback : (err : Error, schema : Schema) => void) : void {
    naming = namingOptions || {};
    naming.defaults = naming.defaults || {};
    naming.defaults.caseType = naming.defaults.caseType || DEFAULT_CASE_TYPE;

    var schema : Schema;
    var sequelize : sequelize.Sequelize = new Sequelize(database, username, password, options);
    var tableLookup : util.Dictionary<Table> = {};
    var xrefs : util.Dictionary<Xref> = {};
    var associationsFound : util.Dictionary<boolean> = {};
    var customReferenceRows : ReferenceDefinitionRow[] = [];
    var idFieldLookup : util.Dictionary<boolean> = {};

    var sql : string =
        "select table_name, column_name, is_nullable, data_type, column_type, column_default, ordinal_position " +
        "from information_schema.columns " +
        "where table_schema = '" + database + "' " +
        "order by table_name, ordinal_position";

    switch (options.dialect) {
        case 'mysql' :
        case 'mariadb' :
            break;
        case 'postgres' :
            sql =
                "select table_name, column_name, data_type, ordinal_position " +
                "from information_schema.columns " +
                "where table_catalog = '" + database + "' and " +
                "table_schema = 'public' " +
                "order by table_name, ordinal_position";
            break;
        default:
            break;
    }
    
    if(options.dialect='sqlite') {
        sql =
            "select name " +
            "from sqlite_master " +
            "where type='table' and name != 'sqlite_sequence' " +
            "order by name";  
        sequelize
            .query(sql)
            .then((rows)=>processTablesSQLite(undefined, rows))
            .catch((err)=>processTablesSQLite(err, null));            
    } else {
        sequelize
            .query(sql)
            .then((rows)=>processTablesAndColumns(undefined, rows[0]))
            .catch((err)=>processTablesAndColumns(err, null));
    }

    function processTablesSQLite(err : Error, tables : Array<string>) : void {
        if (err) {
            callback(err, null);
            return;
        }
        
        if (tables == null) {
            var err : Error = new Error("No schema info returned for database.");
            callback(err, null);
            return;
        }
        
        var rows = <Array<ColumnDefinitionRow>> new Array<any>();
        var index : number = 0;
        
        (function iterate() {
            var table : any = tables[index];
            var sql = 'PRAGMA table_info(' + table + ')';
            sequelize
                .query(sql)
                .then((pragma)=>{
                    index++;
                    for (var k : number = 0; k < pragma[0].length; k++) {
                        var column : any = pragma[0][k];
                        var row = <ColumnDefinitionRow>{};
                        row.table_name = table;
                        row.column_name = column.name;
                        row.column_type = column.type.toLowerCase();
                        row.data_type = column.type.toLowerCase();
                        row.column_default = column.dflt_value;
                        row.is_nullable = (column.notnull =='1') ? '0' : '1';
                        row.ordinal_position = column.cid;
                        rows.push(row);
                    }
                    
                    if(index < tables.length) {
                        iterate();
                    } else {   
                        readCustomFields(rows);
                    }
                });            
        })();      
    }

    function processTablesAndColumns(err : Error, rows : Array<ColumnDefinitionRow>) : void {
        if (err) {
            callback(err, null);
            return;
        }

        if (rows == null) {
            var err : Error = new Error("No schema info returned for database.");
            callback(err, null);
            return;
        }

        if (rows.length == 0) {
            var err : Error = new Error("Empty schema info returned for database.");
            callback(err, null);
            return;
        }

        readCustomFields(rows);
    }

    function readCustomFields(originalRows : ColumnDefinitionRow[]) : void {

        if (!_.any(originalRows, r => r.table_name == 'SequelizeCustomFieldDefinitions')) {
            processTablesAndColumnsWithCustom(originalRows, {});
            return;
        }

        var sql : string =
            "select table_name, column_name, is_nullable, data_type, column_type, column_default, referenced_table_name, referenced_column_name, ordinal_position " +
            "from SequelizeCustomFieldDefinitions " +
            "order by table_name, ordinal_position";

        sequelize
            .query(sql)
            .then((customFields)=>processCustomFields(undefined, customFields))
            .catch((err)=>processCustomFields(err, null));

        function processCustomFields(err : Error, customFields : CustomFieldDefinitionRow[]) : void {

            if (err) {
                callback(err, null);
                return;
            }

            var customFieldLookup : util.Dictionary<ColumnDefinitionRow> =
                util.arrayToDictionary(customFields, 'column_name');

            var combined : ColumnDefinitionRow[] = originalRows.concat(customFields);
            combined.sort(sortByTableNameThenOrdinalPosition);

            customReferenceRows = _.where(customFields, cf => cf.referenced_table_name != null && cf.referenced_column_name != null);

            processTablesAndColumnsWithCustom(combined, customFieldLookup);
        }

    }

    function sortByTableNameThenOrdinalPosition(row1 : ColumnDefinitionRow, row2 : ColumnDefinitionRow) : number {
        return row1.table_name < row2.table_name
            ? -1
            : (row1.table_name > row2.table_name
            ? 1
            : ( row1.ordinal_position < row2.ordinal_position
            ? -1
            : ( row1.ordinal_position > row2.ordinal_position
            ? 1
            : 0)));
    }

    function processTablesAndColumnsWithCustom(rows : ColumnDefinitionRow[], customFieldLookup : util.Dictionary<ColumnDefinitionRow>) : void {

        var tables : Array<Table> = [];
        schema = new Schema(tables);

        var table : Table = new Table(schema, "");

        var calculatedFieldsFound : _.Dictionary<boolean> = {};

        for (var index : number = 0; index < rows.length; index++) {
            var row : ColumnDefinitionRow = rows[index];

            if (row.table_name === 'SequelizeCustomFieldDefinitions') {
                continue;
            }

            if (row.table_name != table.tableName) {
                table = new Table(schema, row.table_name);
                tables.push(table);
            }

            var isCalculated : boolean = customFieldLookup[row.column_name] !== undefined;

            var field : Field = new Field(row.column_name, row.data_type, row.column_type, row.column_default, row.is_nullable, table, false, isCalculated);
            table.fields.push(field);

            if (isCalculated && !calculatedFieldsFound[field.fieldName]) {
                schema.calculatedFields.push(field);
                calculatedFieldsFound[field.fieldName] = true;
            }
        }

        processIdFields();

        readReferences();
    }
    
    function readReferences() : void {

        var sql : string =
            "SELECT	table_name, column_name, referenced_table_name, referenced_column_name " +
            "FROM 	information_schema.key_column_usage " +
            "WHERE	constraint_schema = '" + database + "' " +
            "AND	referenced_table_name IS NOT NULL;";

        switch (options.dialect) {
            case 'mariadb' :
            case 'mysql' :
                break;
            case 'postgres' :
                sql =
                    "SELECT " +
                    "tc.table_name, kcu.column_name, " +
                    "ccu.table_name AS referenced_table_name, " +
                    "ccu.column_name AS referenced_column_name " +
                    "FROM " +
                    "information_schema.table_constraints AS tc " +
                    "JOIN information_schema.key_column_usage AS kcu " +
                    "ON tc.constraint_name = kcu.constraint_name " +
                    "JOIN information_schema.constraint_column_usage AS ccu " +
                    "ON ccu.constraint_name = tc.constraint_name " +
                    "WHERE " +
                    "constraint_type = 'FOREIGN KEY' and " +
                    "kcu.constraint_catalog = '" + database + "' ";
                break;
            default:
                break;
        }

        if(options.dialect == 'sqlite') {
            sql =
                "select name " +
                "from sqlite_master " +
                "where type='table' and name != 'sqlite_sequence' " +
                "order by name";     
            sequelize
                .query(sql)
                .then((rows)=>readReferencesSQLite(undefined, rows))
                .catch((err)=>readReferencesSQLite(err, null)); 
        } else {
            sequelize
                .query(sql)
                .then((rows)=>processReferences(undefined, rows[0]))
                .catch((err)=>processReferences(err, null));
        }            
    }
    
    function readReferencesSQLite(err : Error, tables : Array<string>) : void {
        if (err) {
            callback(err, null);
            return;
        }
        
        var index : number = 0;
        var rows = <Array<ReferenceDefinitionRow>> new Array<any>();
        
        (function iterate() {
            var table : any = tables[index];
            var sql = 'PRAGMA foreign_key_list(' + table + ')';
            sequelize
                .query(sql)
                .then((pragma)=>{                    
                    index++;
                    if(pragma.length > 0) {
                        var row = <ReferenceDefinitionRow>{};
                        row.table_name = table;
                        row.column_name = pragma[0].from;
                        row.referenced_table_name = pragma[0].table;
                        row.referenced_column_name = pragma[0].to;
                        rows.push(row);
                    }
                    if(index < tables.length) {
                        iterate();
                    } else {   
                        processReferences(undefined, rows);
                    }
                });            
        })();   
    }

    function processReferences(err : Error, rows : Array<ReferenceDefinitionRow>) : void {
        if (err) {
            callback(err, null);
            return;
        }

        if (rows == null || rows.length == 0) {
            console.log("Warning: No references defined in database.");
            callback(null, schema);
            return;
        }

        schema.tables.forEach(table => tableLookup[table.tableName] = table);

        rows.forEach(processReferenceRow);
        customReferenceRows.forEach(processReferenceRow);

        processReferenceXrefs();

        switch (options.dialect) {
            case 'postgres' :
                callback(null, schema);
                break;   
            case 'mariadb' :
            case 'mysql' :
            default:
                fixViewNames();
                break;
        }

        function processReferenceRow(row : ReferenceDefinitionRow) : void {
            if (row.table_name.length > 4 && row.table_name.substr(0, 4) == 'Xref') {
                processReferenceXrefRow(row);
                return;
            }

            // Example rows for
            //
            // CREATE TABLE Leads (
            //    leadId integer PRIMARY KEY AUTO_INCREMENT,
            //    accountId integer NOT NULL,
            //
            //    FOREIGN KEY (accountId) REFERENCES Accounts (accountId),
            //  );
            //
            // table_name               =   Leads
            // column_name              =   accountId
            // referenced_table_name    =   Accounts
            // referenced_column_name   =   accountId
            //
            var parentTable = tableLookup[row.referenced_table_name];
            var childTable = tableLookup[row.table_name];

            var associationName : string;

            if (row.column_name !== row.referenced_column_name) {

                // example, row.column_name is ownerUserID
                // we want association to be called OwnerUsers
                // so we take first character and make it uppercase,
                // then take rest of prefix from foreign key
                // then append the referenced table name
                associationName = ChangeCase.snake(row.column_name);
                associationName = row.column_name.slice(0, (row.referenced_column_name.length + 1) * -1);
                if (_.has(naming, 'associationName.tail') && naming.associationName.tail !== null) {
                    if (naming.associationName.tail === 'tableName') {
                        associationName += '_' + row.referenced_table_name;
                    }
                }
                if (_.has(naming, 'associationName.caseType')) {
                    associationName = ChangeCase[naming.associationName.caseType](associationName);
                }

                if (!associationsFound[associationName]) {
                    schema.associations.push(new Association(associationName));
                    associationsFound[associationName] = true;
                }
            }

            // create array of children in parent, i.e., AccountPojo.leads:LeadPojo[]
            // but not for custom fields
            // if (!row.hasOwnProperty('ordinal_position')) {
            // parentTable.fields.push(new Field(
            //     util.camelCase(row.table_name),                                     // Leads -> leads
            //     Sequelize.Utils.singularize(row.table_name) + 'Pojo[]',             // Leads -> LeadPojo[]
            //     undefined,
            //     undefined,
            //     parentTable,                                                        // Accounts table reference
            //     true));
            // }

            // create singular parent reference from child
            childTable.fields.push(new Field(
                util.camelCase(Sequelize.Utils.singularize(
                    associationName === undefined
                        ? row.referenced_table_name                             // Accounts -> account
                        : associationName)),                                    // ownerUserId -> OwnerUsers -> ownerUser
                ChangeCase[naming.defaults.caseType](ChangeCase.snake(row.referenced_table_name) + '_pojo'),    // Accounts -> AccountPojo
                undefined,
                undefined,
                undefined,
                childTable,
                true));

            // tell Sequelize about the reference
            schema.references.push(new Reference(
                row.referenced_table_name,
                row.table_name,
                associationName,
                util.camelCase(Sequelize.Utils.singularize(row.referenced_table_name)) + toTitleCase(Schema.idSuffix),
                row.column_name,
                false,
                schema));
        }

        function processReferenceXrefRow(row : ReferenceDefinitionRow) : void {
            var xref : Xref = xrefs[row.table_name];

            if (xref == null) {
                xrefs[row.table_name] = new Xref(
                    row.referenced_table_name,
                    row.referenced_column_name,
                    null,
                    null,
                    row.table_name);
            } else {
                xref.secondTableName = row.referenced_table_name;
                xref.secondFieldName = row.referenced_column_name;
            }
        }

        function processReferenceXrefs() : void {
            for (var xrefName in xrefs) {

                if (!xrefs.hasOwnProperty(xrefName)) {
                    continue;
                }

                var xref : Xref = xrefs[xrefName];

                schema.xrefs.push(xref);

                var firstTable : Table = tableLookup[xref.firstTableName];
                var secondTable : Table = tableLookup[xref.secondTableName];

                firstTable.fields.push(new Field(
                    util.camelCase(xref.secondTableName),
                    Sequelize.Utils.singularize(xref.secondTableName) + 'Pojo[]',
                    undefined,
                    undefined,
                    undefined,
                    firstTable,
                    true));

                secondTable.fields.push(new Field(
                    util.camelCase(xref.firstTableName),
                    Sequelize.Utils.singularize(xref.firstTableName) + 'Pojo[]',
                    undefined,
                    undefined,
                    undefined,
                    secondTable,
                    true));

            }
        }
    }

    function fixViewNames() : void {

        var tableNamesManyForms : string[] = [];

        _.each(schema.tables, extrapolateTableNameForms);

        _.each(schema.tables, fixViewName);

        if (schema.views.length) {
            addViewReferences();
        }

        callback(null, schema);

        function extrapolateTableNameForms(table : Table, index : number, array : Table[]) : void {

            if (table.tableName === table.tableName.toLowerCase()) {
                return;
            }

            tableNamesManyForms.push(table.tableName);
            tableNamesManyForms.push(Sequelize.Utils.singularize(table.tableName));
        }

        function fixViewName(table : Table, index : number, array : Table[]) : void {

            if (table.tableName !== table.tableName.toLowerCase()) {
                return;
            }
            table.isView = true;
            schema.views.push(table);

            _.each(tableNamesManyForms, fixViewNamePart);

            function fixViewNamePart(otherTableNameForm : string, index : number, array : string[]) : void {
                var i : number = table.tableName.indexOf(otherTableNameForm.toLowerCase());
                if (i < 0) {
                    return;
                }

                var newTableName : string = '';

                if (i !== 0) {
                    newTableName = table.tableName.substr(0, i);
                }

                newTableName += otherTableNameForm;

                if (table.tableName.length > i + otherTableNameForm.length + 1) {
                    newTableName += table.tableName.charAt(i + otherTableNameForm.length).toUpperCase() +
                        table.tableName.substr(i + otherTableNameForm.length + 1);
                }

                table.tableName = newTableName;
            }
        }
    }

    function addViewReferences() : void {
        schema.views.forEach(addViewReference);
    }

    function addViewReference(view : Table, index : number, array : Table[]) : void {
        view.fields.forEach(addViewFieldReference);

        function addViewFieldReference(field : Field, index : number, array : Field[]) : void {
            if (!field.isIdField()) {
                return;
            }

            var otherTableName : string = Sequelize.Utils.pluralize(field.fieldNameProperCase().substr(0, field.fieldName.length - Schema.idSuffix.length));

            switch (options.dialect) {
                case 'mariadb' :
                case 'mysql' :
                    break;
                case 'postgres' :
                    otherTableName = otherTableName.toLowerCase();
                    break;
                default:
                    break;
            }

            var otherTable : Table = tableLookup[otherTableName];
            if (otherTable === undefined) {
                console.log('Unable to find related table for view ' + view.tableName + '.' + field.fieldName + ', expected ' + otherTableName + '.');
                return;
            }

            var reference : Reference = new Reference(otherTableName,
                view.tableName,
                undefined,
                field.fieldName,
                field.fieldName,
                true,
                schema);

            schema.references.push(reference);

            var otherTableSingular : string = Sequelize.Utils.singularize(otherTableName);

            view.fields.push(new Field(
                otherTableSingular,
                otherTableSingular + 'Pojo',
                undefined,
                undefined,
                undefined,
                view,
                true));

            otherTable.fields.push(new Field(
                util.camelCase(view.tableName),
                Sequelize.Utils.singularize(view.tableName) + 'Pojo[]',
                undefined,
                undefined,
                undefined,
                otherTable,
                true));

        }
    }

    function processIdFields() : void {
        var idSuffix = Schema.idSuffix;

        if (idSuffix == null || !idSuffix.length) {
            return;
        }

        var idFields : Array<Field> = [];

        var idSuffixLen : number = idSuffix.length;

        for (var tableIndex : number = 0; tableIndex < schema.tables.length; tableIndex++) {
            var table : Table = schema.tables[tableIndex];

            if (table == null || table.fields == null || table.fields.length === 0) {
                continue;
            }

            var field : Field = table.fields[0];
            var fieldName : string = field.fieldName;

            if (!idFieldLookup[fieldName] &&
                fieldName.length > idSuffixLen &&
                fieldName.substr(fieldName.length - idSuffixLen, idSuffixLen).toLocaleLowerCase() == idSuffix) {
                idFields.push(field);
                idFieldLookup[fieldName] = true;
            }
        }

        schema.idFields = idFields;
        schema.idFieldLookup = idFieldLookup;

        processPrefixedForeignKeyTypes();
    }

    function processPrefixedForeignKeyTypes() : void {

        var idSuffix = Schema.idSuffix;
        var idSuffixLen : number = idSuffix.length;

        for (var tableIndex : number = 0; tableIndex < schema.tables.length; tableIndex++) {
            var table : Table = schema.tables[tableIndex];

            if (table == null || table.fields == null || table.fields.length < 2) {
                continue;
            }

            // first field is never a prefixed foreign key
            for (var fieldIndex : number = 1; fieldIndex < table.fields.length; fieldIndex++) {
                var field : Field = table.fields[fieldIndex];
                var fieldName : string = field.fieldName;

                if (!idFieldLookup[fieldName] &&
                    fieldName.length > idSuffixLen &&
                    fieldName.substr(fieldName.length - idSuffixLen, idSuffixLen).toLocaleLowerCase() == idSuffix) {
                    // not in lookup but is id field, so must be prefixed id field
                    // ex. ownerUserId
                    //
                    // need to find the actual id field
                    // ex. userId

                    for (var c : number = 1; c < fieldName.length - 2; c++) {
                        var rest : string = fieldName.charAt(c).toLowerCase() + fieldName.substr(c + 1);
                        if (idFieldLookup[rest]) {
                            // found it
                            field.targetIdFieldType = ChangeCase[naming.defaults.caseType](rest);
                        }
                    }
                }
            }
        }
    }
}

function toTitleCase(text : string) : string {
    return text.charAt(0).toUpperCase() + text.substr(1, text.length - 1);
}

function toCamelCase(text : string) : string {
    return text.charAt(0).toLowerCase() + text.substr(1);
}
