# sequelize-auto-ts

Generate Sequelize definition statements and compatible TypeScript definitions from a database schema

# Development Notes

* *Composite Primary and Foreign Keys*

    Composite Primary and Foreign Keys are currently NOT supported in Sequelize. Hence as a result, are
NOT supported by this library.
    * See: https://github.com/sequelize/sequelize/issues/1485
    * See: https://github.com/sequelize/sequelize/issues/311

* *Table names on MySQL and Windows*

    Table and database names are stored on disk using the lettercase specified in the CREATE TABLE or CREATE DATABASE
statement, but MySQL converts them to lowercase on lookup. Name comparisons are not case sensitive.

    http://dev.mysql.com/doc/refman/5.0/en/identifier-case-sensitivity.html

    lower_case_table_names=2

# Pre-prerequisites

You will need the following things properly installed on your computer.

* node >= 5
* npm >= 3

To install the above, it is highly recommended to use a node version manager (i.e. https://github.com/creationix/nvm)

# Pre-requisites

* typescript >= 1.8 `npm install -g typescript`
* typings >= 1.x `npm install -g typings`
* grunt-cli `npm install -g grunt-cli`

__NOTES (05/20/2016)__ - check the version of `typings` you are using. if it's < 1.x, there are breaking changes that 1.x has introduced and you will need to install the latest version.

### Install npm and typscript Packages

* `npm install`
* `typings install`

### Build Typescript Sources

The following should lint and transpile typescript sources to javascript (there should be no errors)

* `npm run build`

# Running sequelize-auto-ts

Change directory to the root of the source: `sequelize-auto-ts/`

Use node to execute `lib\cli.ts` and pass in four required parameters:

* database
* username
* password
* target directory
* database dialect

Current supported database dialects:

* MySQL - `mysql`
* PostGresql - `postgres`
* SQlite - `sqlite`

run the following command:

```
node lib/cli.js [database-name] [username] [password] [output-path] [database-dialect]
```

example:

```
node lib/cli.js northwind dbuser password temp postgres
```

Additionally, you may also run the CLI in interactive mode by running the following (without arguments):

```
node lib/cli.js
```

# Generated files

sequelize-auto-ts will generate two custom files in the target directory and copy one or two definition files.

`sequelize-types.ts`

This file contains interfaces for all of the tables in the database. Three interfaces are created for each table as well as an interface for each ID field.  These are explained in detail below.

`sequelize-models.ts`

This file contains all of the Sequelize model definitions. This module exposes an `initialize` function which defines all of the models (tables) within Sequelize. This method must be called before any of the sequelize-auto-ts generated instances can be used. In addition to the `instance` method, a single model variable is exposed for each table which is then used to query individual tables.

`sequelize.d.ts`

This is definitions for all of the core Sequelize functionality. It is copied to the target if it is not found in the target project. The project is defined as the first parent folder of the target directory that contains a `package.json` file. If you prefer to place all of your library definition files in a specific directory, move this file to your desired directory within your project and re-run sequelize-auto-ts. sequelize-auto-ts will find the file and calculate the proper relative paths to be used in `sequelize-models.ts` and `sequelize-types.ts`.

`node.d.ts`

This is the definition file for Node. As with `sequelize.d.ts` if it is found in the target project the existing definition file will be referenced. If the file is not found, then it is copied to the target directory. Note that sequelize-auto-ts will not reference any definition file underneath `node_modules`.

# Demo Database Schema

For the rest of the explanation we'll use a very simple database with two tables and a relationship between them. It is defined as follows:

MySQL

```SQL
CREATE TABLE Roles (
	RoleID INTEGER PRIMARY KEY AUTO_INCREMENT,
	RoleName VARCHAR(255) NOT NULL
);

CREATE TABLE Users (
	UserID INTEGER PRIMARY KEY AUTO_INCREMENT,
	RoleID INTEGER NOT NULL,
	UserName VARCHAR(255) NOT NULL,

	FOREIGN KEY (RoleID) REFERENCES Roles(RoleID)
);
```

PostGresql

```SQL
CREATE TABLE Roles (
	RoleID SERIAL PRIMARY KEY,
	RoleName VARCHAR(255) NOT NULL
);

CREATE TABLE Users (
	UserID SERIAL PRIMARY KEY,
	RoleID INTEGER NOT NULL,
	UserName VARCHAR(255) NOT NULL,

	FOREIGN KEY (RoleID) REFERENCES Roles(RoleID)
);

```

Sqlite

```SQL
CREATE TABLE `Roles` (
	`RoleID`	INTEGER PRIMARY KEY AUTOINCREMENT,
	`RoleName`	TEXT NOT NULL
);

CREATE TABLE `Users` (
	`UserID`	INTEGER PRIMARY KEY AUTOINCREMENT,
	`RoleID`	INTEGER NOT NULL,
	`UserName`	TEXT NOT NULL,

	FOREIGN KEY (RoleID) REFERENCES Roles(RoleID)
);
```

# Generated Interfaces

For this simple database with just two tables, sequelize-auto-ts will generate eight interfaces in `sequelize-types.ts`.

```JS
export interface RoleID { RoleID:number; }
export interface UserID { UserID:number; }
```

First we generate an interface for all recognized ID fields. This is a bit of a trick to help prevent accidentally assigning an ID type from one table to another, example, passing a `UserID` when you meant to pass a `RoleID`. Note the values are actually just a number, not an object containing the field and number.

```JS
export interface RolePojo
{
    RoleID?:number;
    RoleName?:string;
    users?:UserPojo[];
}

export interface UserPojo
{
    UserID?:number;
    RoleID?:number;
    UserName?:string;
    role?:RolePojo;
}
```

Next for each table we genearte a plain JavaScript object, with the table name followed by `Pojo`. This base type is used in some input methods so they can easily be generated from scratch and are also returned from instance methods (defined below) by the `toJSON` method.

```JS
export interface RoleInstance extends sequelize.Instance<RolePojo>, RolePojo { }

export interface UserInstance extends sequelize.Instance<UserPojo>, UserPojo { }
```

Each table then gets an `Instance` interface. This interface represents the object actually returned by Sequelize for each database entity. This interface extends the corresponding `Pojo` interface and thus has an interface field for every database field. It additionally extends `sequelize.Instance` which defines all of the Sequelize methods and fields available on instances, such as `get()`, `set()`, `save()`, etc. For a full list of available methods see the Sequelize documentation or refer to `sequelize.d.ts`.

Note that the `Instance` instances have circular references and cannot be directly converted to JSON. Instead call either the `toJSON()` method or use the `values` field to return the plain `Pojo` corresponding to the `Instance` which can then be converted to JSON.

```JS
export interface RolesModel extends sequelize.Model<RoleInstance, RolePojo> {
    getRole:(role:RolePojo) => sequelize.PromiseT<RoleInstance>;
}

export interface UsersModel extends sequelize.Model<UserInstance, UserPojo> {
    getUser:(user:UserPojo) => sequelize.PromiseT<UserInstance>;
}
```

Lastly a `Model` interface is defined for each table. Later in the `sequelize-models.ts` file we'll instantiate a single variable for each model which is used to query the database and act on the table. In addition to the standard methods and fields defined by Sequelize on each model, sequelize-auto-ts also provides a helper `getXxx()` method which is a shortcut for `get()`. Using `getXxx()` you can pass a pojo directly, containing any subset of fields, and Sequelize will query for a single row matching the values provided.

Note that you are unlikely to ever define an instance of the model interfaces yourself--they are provided in `sequelize-model.ts`.

# Generated Sequelize Definitions and Models

One model for each table along with the proper initialization (`define()`) call is generated in `sequelize-models.ts`.

The important method is `initialize()`:

```JS
export function initialize(database:string, username:string, password:string, options:sequelize.Options):void {
   ...
}
```

Call this function to define all of the models within Sequelize. It must be called once prior to using Sequelize through sequelize-auto-ts generated types.

Then for each table, a single model instance is defined:

```JS
export var Roles:types.RolesModel;
export var Users:types.UsersModel;
```

This allows you to quickly query the database through Sequelize's API and return typed objects. For example, to query a list of users:

```JS
import types = require('./mysql-userdemo-generated/sequelize-types');
import models = require('./mysql-userdemo-generated/sequelize-models');

models.initialize(database, username, password, null);

models.Users.findAll().complete((err:Error, users:types.UserInstance[]) => {

    console.log('Returned ' + users.length + ' users.');

    users.forEach( (user:types.UserPojo) => {
        console.log(user.UserName + ' (' + user.UserID + ')');
    })
});
```

In the above example, `findAll().complete()` takes a typed callback. If the argument types are not defined correctly, TypeScript will give a proper syntax error.

# sequelize-auto-ts.json

e.g.

```json
{
    "database": "test_db",
    "username": "root",
    "password": "test",
    "targetDirectory": "dest",
    "naming": {
        "defaults": {
            "caseType": "pascal"
        },
        "associationName": {
            "caseType": "snake",
            "tail": null
        }
    }
}
```

