import types = require('./sequelize-types');
import models = require('./sequelize-models');

var config = require('../config.js');
try { config = require('../config.local.js'); } catch (ex) { }

models.initialize(config.mysql.database, config.mysql.username, config.mysql.password, {
    dialect : 'mysql',
    define : {
        timestamps : false
    },
    host : config.mysql.host
});

let findall = models.UsersModel.findAll();

findall
    .catch((error : any) => {
        throw error;
    })
    .done((users : any) => {
        console.log('Returned ' + users.length + ' users.');

        users.forEach((user : types.UsersPojo) => {
            console.log(user.UserName + ' (' + user.UserID + ')');
        })
    });
