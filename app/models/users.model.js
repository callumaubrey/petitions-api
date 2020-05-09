const db = require('../../config/db');
const crypto = require('crypto');
const hashing = require('../helpers/hashing');

exports.isValidEmail = function (email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
};

exports.isLoggedIn = async function (userId, token) {
    try {
        let dbUserId = await exports.getIdByToken(token);
        if (dbUserId == null) return null;
        if (userId !== false) {
            // For when we don't have a get parameter
            if (dbUserId !== parseInt(userId)) return false;
        }
        return dbUserId;
    } catch (err) {
        throw err;
    }
};

exports.emailExists = async function (email) {
    try {
        let s =  'select user_id from User where email = ?';
        let [row] = await db.getPool().query(s, [email]);
        if (row.length >= 1) return true;
        return false;
    } catch (err) {
        console.log(err.sql);
        throw err;
    }
};

exports.insert = async function (data) {
    try {
        let s = 'insert into User(name, email, password, city, country) values(?, ?, ?, ?, ?)';
        let dbData = [data[0], data[1], hashing.getHashedPassword(data[2]), data[3], data[4]];
        let [row] = await db.getPool().query(s, dbData);
        return row;
    } catch (err) {
        console.log(err.sql);
        throw err;
    }
};

exports.authenticate = async function (data) {
    try {
        let email = data[0];
        let pass = data[1];
        let s = 'select user_id, password from User where email = ?';
        let [rows] = await db.getPool().query(s, [email]);
        if (rows.length == 0) return null;
        if (hashing.verifyPassword(pass, rows[0].password)) return rows[0];
        return false;
    } catch (err) {
        console.log(err.sql);
        throw err;
    }
};

exports.checkAndSetToken = async function (userId) {
    try {
        let token = crypto.randomBytes(16).toString('hex');
        let s = 'select auth_token from User where user_id = ?';
        let [rows] = await db.getPool().query(s, [userId]);

        // Already logged in
        if (rows[0].auth_token !== null) return rows[0].auth_token;

        let s1 = 'update User set auth_token = ? where user_id = ?';
        await db.getPool().query(s1, [token, userId]);

        return token;
    } catch (err) {
        console.log(err.sql);
        throw err;
    }
};

exports.deleteToken = async function (userId) {
    try {
        let s = 'update User set auth_token = null where user_id = ?';
        let [rows] = await db.getPool().query(s, [userId]);
        return rows.affectedRows;
    } catch (err) {
        console.log(err);
        throw err;
    }
};

exports.getIdByToken = async function (token) {
    try {
        let s = 'select user_id from User where auth_token = ? limit 1';
        let [rows] = await db.getPool().query(s, [token]);
        if (rows.length == 0) return null;
        return rows[0].user_id;
    } catch (err) {
        console.log(err);
        throw err;
    }
};

exports.getOne = async function (userId) {
    try {
        let s = 'select * from User where user_id = ? limit 1';
        let [rows] = await db.getPool().query(s, [userId]);
        return rows;
    } catch (err) {
        console.log(err.sql);
        throw err;
    }
};

exports.update = async function (data, hashPassword) {
    try {
        let s = 'update User set name = ?, email = ?, password = ?, city = ?, country = ? where user_id = ?';
        let password = hashing.getHashedPassword(data['password']);
        if (!hashPassword) {
            password = data['password'];
        }
        let db_data = [
            data['name'],
            data['email'],
            password,
            data['city'],
            data['country'],
            data['user_id']
        ];
        let [row] = await db.getPool().query(s, db_data);
        return row;
    } catch (err) {
        console.log(err.sql);
        throw err;
    }
};

exports.deletePhoto = async function (userId) {
    try {
        let s = 'update User set photo_filename = null where user_id = ?';
        let [row] = await db.getPool().query(s, [userId]);
        return row;
    } catch (err) {
        console.log(err.sql);
        throw err;
    }
};

exports.updatePhoto = async function (filePath, userId) {
    try {
        let s = 'update User set photo_filename = ? where user_id = ?';
        let [row] = await db.getPool().query(s, [filePath, userId]);
        return row;
    } catch (err) {
        console.log(err.sql);
        throw err;
    }
};
