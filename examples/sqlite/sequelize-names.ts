////////////////////////////////////////////////////////////////////
//
// GENERATED CLASS
//
// DO NOT EDIT
//
// See sequelize-auto-ts for edits
//
////////////////////////////////////////////////////////////////////

'depends typescript-client-server-compat.js';

import types = require('./sequelize-types');

export interface SequelizeNames {
    TableNames: TableNames;
    calculatedFields:CalculatedFields;
    references:References;
    roleFields:RolesFields;
    userFields:UsersFields;
}

export class TableNames {
    Roles:string = 'Roles';
    Users:string = 'Users';
}
export var tableNames:TableNames = new TableNames();

export class RolesFields {
    RoleID:string = 'RoleID';
    RoleName:string = 'RoleName';
}
export var rolesFields:RolesFields = new RolesFields();


export class UsersFields {
    UserID:string = 'UserID';
    RoleID:string = 'RoleID';
    UserName:string = 'UserName';
    role:string = 'role';
}
export var usersFields:UsersFields = new UsersFields();


export class CalculatedFields {}
export var calculatedFields:CalculatedFields = new CalculatedFields();

export class References {
    RoleID:types.Reference = { tableName: 'Roles', primaryKey: 'roleId', foreignKey: 'RoleID', as: undefined};
    UserID:types.Reference = { tableName: 'Users', primaryKey: 'UserID', foreignKey: 'UserID', as: undefined};
}

export var references:References = new References();
