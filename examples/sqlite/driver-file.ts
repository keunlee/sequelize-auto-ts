import types = require('./sequelize-types');
import models = require('./sequelize-models');

models.initialize('database', 'dbuser', 'password', {
    dialect : 'sqlite',
    define : {
        timestamps : false
    },
    storage : 'sqlite.db'
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
