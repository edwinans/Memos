var express = require('express');
var serv = express();
var bodyParser = require('body-parser');
var con = require('./db/config_db');
var cookieSession = require('cookie-session');
var bcrypt = require('bcrypt');

serv.use(bodyParser.json());
serv.use(bodyParser.urlencoded({ extended: false }));
serv.set('view engine', 'ejs');
serv.use(express.static('public'));
serv.use(express.static('public/images'));
serv.use(express.static('public/css'));

serv.use(cookieSession({
    name: 'session',
    keys: ['key1', 'key2'],
    maxAge: 30 * 60 * 1000 // 30min
}));

function fillMemos() {
    var sql = "INSERT INTO memos (user_id, title, content) VALUES ?";
    // var values = [
    //     ['edwin'],
    //     ['jack'],
    //     ['bill'],
    //     ['sarah24'],
    //     ['igor_9'],
    //     ['batman'],
    //     ['ggold']
    // ];
    var values = [
        [1, 'title1', 'i am the first memo'],
        [2, 'title2', 'i am the snd memo'],
        [3, 'title3', 'i am the third memo'],
        [4, 'title4', 'i am the 4th memo'],
        [5, 'title5', 'i am the 5th memo'],
        [6, 'title6', 'i am the 6th memo'],
        [7, 'title7', 'i am the 7th memo']
    ];
    con.query(sql, [values], function(err, result) {
        if (err) throw err;
        console.log("Number of records inserted: " + result.affectedRows);
    });
}

function clearMemos() {
    var sql = "DELETE FROM memos";
    con.query(sql, function(err, result) {
        if (err) throw err;
        console.log("Number of records deleted: " + result.affectedRows);
    });
}

function insertMemo(userId, memo) {
    var sql = "INSERT INTO memos (user_id, title, content) VALUES ?";
    var values = [
        [userId, memo.title, memo.content]
    ];
    con.query(sql, [values], function(err, result) {
        if (err) throw err;
        console.log(result.affectedRows + " memo inserted, memo-id: " + result.insertId);
    });
}

function insertUserMemo(memoId, user_access) {
    var sql = "INSERT INTO user_memo (user_id, memo_id, access) VALUES ?";
    var values = [];
    for (user of user_access) {
        var arr = [user.user_id, memoId];
        if (user.write)
            arr.push(2); //read and write
        else if (user.read)
            arr.push(1); //read only
        else
            continue;
        values.push(arr); // in form of [user_id, memo_id, access=1|2]
    }

    con.query(sql, [values], function(err, result) {
        if (err) throw err;
        console.log(result.affectedRows + " memo_user inserted");

    });
}

function pushAcessToUsers(users, userMemos) {
    for (user of users) {
        for (userMemo of userMemos) {
            if (userMemo.user_id == user.id) {
                user.access = userMemo.access;
                break;
            }
        }
    }
}

function isAlphaNum(str) {
    if (str.match(/^[0-9a-zA-Z]+$/))
        return true;
    else
        return false;
}

const ifLoggedin = (req, res, next) => {
    if (req.session.isLoggedIn) {
        return res.redirect('/show-memos');
    }
    next();
};

const ifNotLoggedin = (req, res, next) => {
    if (!req.session.isLoggedIn) {
        return res.render('view.ejs', { errors: [] });
    }
    next();
};

const ifUserExist = (req, res, next) => {
    var user = req.body.loginUser;
    con.query('SELECT username FROM users WHERE username=?', [user], function(err, result) {
        if (result.length == 1) {
            next();
        } else {
            console.log("user not found!")
            res.render('view.ejs', {
                errors: ['User not found!']
            });
        }
    });
};

const ifUserNotExist = (req, res, next) => {
    var user = req.body.registerUser;
    con.query('SELECT username FROM users WHERE username=?', [user], function(err, result) {
        if (result.length <= 0) {
            next();
        } else {
            console.log("user already exist!")
            res.render('view.ejs', {
                errors: ['This username already in use!']
            });
        }
    });
};

const ifUserCanModify = (req, response, next) => {
    const userId = req.session.userID;
    const memoId = req.params.id;
    var sql = "SELECT access FROM user_memo WHERE user_id=? AND memo_id=?";
    con.query(sql, [userId, memoId], function(err, res) {
        if (err) throw err;
        console.log("user access: " + (res[0].access == 1 ? "r" : "rw"));
        if (res[0].access === 2)
            next();
        else
            response.send("<p> Error: you don't have permission to delete or edit this memo! </p>\
                <a href='/show-memos'> Back </a> ");
    });
};


serv.get('/', ifNotLoggedin, (req, response, next) => {
    response.redirect("/show-memos");

});


serv.get("/show-memos", ifNotLoggedin, function(req, response) {
    var sql = "SELECT * FROM user_memo WHERE user_id=?";
    con.query(sql, [req.session.userID], function(err, res) {
        if (err) throw err;
        if (res.length <= 0) {
            return response.render('show-memos.ejs', {
                memos: []
            });
        }
        var arrMemoId = [];
        for (record of res) {
            arrMemoId.push(record.memo_id);
        }
        sql = "SELECT memos.content, memos.title, memos.id, users.username FROM memos JOIN users ON memos.user_id = users.id WHERE memos.id IN ?";
        con.query(sql, [
            [arrMemoId]
        ], function(err, res) {
            if (err) throw err;

            response.render('show-memos.ejs', {
                memos: res
            });
        });
    });


});

serv.get("/show-memos/:id", ifNotLoggedin, function(req, response) {
    const memoId = req.params.id;

    var sql = "SELECT * FROM memos WHERE id=" + memoId;
    con.query(sql, function(err, res1) {
        if (err) throw err;
        sql = "SELECT * FROM user_memo WHERE memo_id=?";
        con.query(sql, [memoId], function(err, res2) {
            if (err) throw err;

            var userIDs = [];
            for (record of res2) {
                userIDs.push(record.user_id);
            }
            sql = "SELECT * FROM users WHERE id IN ?";
            con.query(sql, [
                [userIDs]
            ], function(err, res3) {
                if (err) throw err;
                pushAcessToUsers(res3, res2);

                response.render('memo-content.ejs', {
                    memo: res1[0],
                    users: res3
                });
            });


        });
    });
});

serv.get("/edit-memo/:id", ifNotLoggedin, ifUserCanModify, function(req, response) {
    const memoId = req.params.id;

    var sql = "SELECT * FROM memos WHERE id=" + memoId;
    con.query(sql, function(err, res, fields) {
        if (err) throw err;
        response.render('edit-memo.ejs', {
            memo: res[0]
        });
    });
});

serv.get("/delete-memo/:id", ifNotLoggedin, ifUserCanModify, function(req, response) {
    const memoId = req.params.id;

    var sql = "DELETE FROM memos WHERE id=" + memoId;
    con.query(sql, function(err, res) {
        if (err) throw err;
        sql = "DELETE FROM user_memo WHERE memo_id=" + memoId;
        con.query(sql, function(err, res) {
            if (err) throw err;
            response.send("<p> memo deleted successully click <a href='/show-memos'> here </a> to back </p>")
        });

    });
});

serv.get("/create-memo", ifNotLoggedin, function(req, response) {
    var userId = req.session.userID;
    var sql = "SELECT * FROM users WHERE NOT id=?";
    con.query(sql, userId, function(err, res) {
        if (err) throw err;
        response.render('create-memo.ejs', {
            users: res
        });
    });
});

serv.get('/logout', (req, res) => {
    req.session = null;
    res.redirect('/');
});

serv.post("/create-memo/add-memo", ifNotLoggedin, function(req, response) {
    var memo = req.body.memo;
    // 1. insert memo into memos tbl
    var actUser = req.session.userID;
    memo.user_access.push({ user_id: actUser, read: true, write: true }); //set user itself access to read and write!
    insertMemo(actUser, memo);

    // 2. insert into user_memo tbl with access
    var sql = "SELECT MAX(ID) from memos";
    con.query(sql, function(err, res) {
        if (err) throw err;
        console.log(res[0]['MAX(ID)']);
        insertUserMemo(res[0]['MAX(ID)'], memo.user_access);
        //response.send("<p> Memo added successfully! title: " + memo.title + "</p>");

    });

});

serv.post("/edit-memo/submit", ifNotLoggedin, function(req, response) {
    const memo = req.body.memo;
    // 1. update memo into memos tbl
    var sql = "UPDATE memos SET title =? , content =?  WHERE id = ?";

    con.query(sql, [memo.title, memo.content, memo.id], function(err, result) {
        if (err) throw err;
        console.log(result.affectedRows + " memo updated, memo-id: " + result.insertId);
        //response.send("<p> memo updated successully! click <a href='/show-memos'> here </a> to back </p>");
    });

});

serv.post('/login', ifLoggedin, ifUserExist, (req, res) => {
    const { loginPass, loginUser } = req.body;

    con.query("SELECT * FROM users WHERE username=?", [loginUser], function(err, results) {
        if (err) throw err;
        bcrypt.compare(loginPass, results[0].password).then(compare_result => {
            if (compare_result === true) {
                req.session.isLoggedIn = true;
                req.session.userID = results[0].id;

                res.redirect('/');
            } else {
                console.log("invalid pass!");
                res.render('view.ejs', {
                    errors: ['Invalid Password!']
                });
            }
        });
    });
});

serv.post('/register', ifLoggedin, ifUserNotExist, (req, res) => {

    const { registerUser, registerPass, registerPassConfirm } = req.body;

    if (!isAlphaNum(registerUser) || !isAlphaNum(registerPass) || !isAlphaNum(registerPassConfirm)) {
        console.log("user or pass not alphanum!");
        return res.render('view.ejs', { errors: ['User or pass not alphanumeric!'] });
    }

    if (registerPass == registerPassConfirm) {
        bcrypt.hash(registerPass, 12).then((hash_pass) => {
                con.query("INSERT INTO users (username,password) VALUES(?,?)", [registerUser, hash_pass], function(err, results) {
                    if (err) throw err;
                    res.send('your account has been created successfully, Now you can <a href="/">Login</a>');
                });
            })
            .catch(err => {
                if (err) throw err;
            })
    } else {
        console.log("password not equal");
        res.render('view.ejs', {
            errors: ['please re-fill passwords']
        });
    }

});

serv.use('/', (req, res) => {
    res.status(404).send('<h1>404 Page Not Found!</h1>');
});

serv.listen(8080);