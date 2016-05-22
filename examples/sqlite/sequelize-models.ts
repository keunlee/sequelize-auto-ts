////////////////////////////////////////////////////////////////////
//
// GENERATED CLASS
//
// DO NOT EDIT
//
// See sequelize-auto-ts for edits
//
////////////////////////////////////////////////////////////////////

/// <reference path="../../typings/index.d.ts" />

import sequelize = require('sequelize');
import types = require('./sequelize-types');

var Sequelize:sequelize.SequelizeStatic = require('sequelize');

export var initialized:boolean = false;
export var SEQUELIZE:sequelize.Sequelize;

export var RolesModel:types.RolesModel;
export var UsersModel:types.UsersModel;


export function initialize(database:string, username:string, password:string, options:sequelize.Options):any
{
    if (initialized)
    {
        return;
    }

    SEQUELIZE = new Sequelize(database, username, password, options);

    RolesModel = <types.RolesModel> SEQUELIZE.define<types.RolesInstance, types.RolesPojo>('Role', {
        'RoleID': {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
        'RoleName': {type: Sequelize.STRING, allowNull: false}
        },
        {
            classMethods: {
                GetRoles:(role:any) => {
                    var where:{[key:string]:any} = {};
                    var id:number = parseInt(role);
                    if (isNaN(id)) {
                        if (role['RoleID'] !== undefined) { where['RoleID'] = role['RoleID']}
                        if (role['RoleName'] !== undefined) { where['RoleName'] = role['RoleName']}
                    } else {
                        where['RoleID'] = id;
                    }
                    return RolesModel.find({where: where});
                }
            }
        });
    
    UsersModel = <types.UsersModel> SEQUELIZE.define<types.UsersInstance, types.UsersPojo>('User', {
        'UserID': {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
        'RoleID': {type: Sequelize.INTEGER, allowNull: false},
        'UserName': {type: Sequelize.STRING, allowNull: false}
        },
        {
            classMethods: {
                GetUsers:(user:any) => {
                    var where:{[key:string]:any} = {};
                    var id:number = parseInt(user);
                    if (isNaN(id)) {
                        if (user['UserID'] !== undefined) { where['UserID'] = user['UserID']}
                        if (user['RoleID'] !== undefined) { where['RoleID'] = user['RoleID']}
                        if (user['UserName'] !== undefined) { where['UserName'] = user['UserName']}
                    } else {
                        where['UserID'] = id;
                    }
                    return UsersModel.find({where: where});
                }
            }
        });
    
    RolesModel.hasMany(UsersModel, {foreignKey: 'RoleID' });
    UsersModel.belongsTo(RolesModel, {as: undefined, foreignKey: 'RoleID' });

    
    return exports;
}
