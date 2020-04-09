var mysql = require('mysql');

const credit = {
    host: "you mysql server host",
    user: "your mysql username",
    password: "your mysql password",
    database: "mysql db name that you want to use"
};

var connection = mysql.createConnection(credit);

connection.connect(function(err) {
    if (err) throw err;
    console.log("Connected to DB!");

    const createUsers = 'CREATE TABLE IF NOT EXISTS users (\
        id int PRIMARY KEY AUTO_INCREMENT,\
        username varchar(30),\
        password varchar(255),\
        created_at timestamp\
      )';

    connection.query(createUsers, function(err, results) {
        if (err) {
            console.log(err.message);
        }
        if (results.warningCount == 0)
            console.log("table 'users' created!");
        else
            console.log("no changes: table 'users' already exist!");
    });

    const createMemos = 'CREATE TABLE IF NOT EXISTS memos (\
        id int PRIMARY KEY AUTO_INCREMENT,\
        user_id int,\
        title varchar(50),\
        content text,\
        created_at timestamp\
      )';

    connection.query(createMemos, function(err, results) {
        if (err) {
            console.log(err.message);
        }
        if (results.warningCount == 0)
            console.log("table 'memos' created!");
        else
            console.log("no changes: table 'memos' already exist!");
    });

    const createUserMemo = 'CREATE TABLE IF NOT EXISTS user_memo (\
        id int PRIMARY KEY AUTO_INCREMENT,\
        user_id int,\
        memo_id int,\
        access int,\
        created_at timestamp\
      )';

    connection.query(createUserMemo, function(err, results) {
        if (err) {
            console.log(err.message);
        }
        if (results.warningCount == 0)
            console.log("table 'user_memo' created!");
        else
            console.log("no changes: table 'user_memo' already exist!");
    });
});

module.exports = connection;
