const User = require('../models/users.model');
const hashing = require('../helpers/hashing');
const fs = require('fs');

// Register
exports.create = async function (req, res) {
    try {
        // Validate email
        if (User.isValidEmail(req.body.email) === false) return res.sendStatus(400);
        if (req.body.name === '' || req.body.hasOwnProperty('name') == false
            || req.body.password === '') return res.sendStatus(400);

        let exists = await User.emailExists(req.body.email);
        if (exists) return res.sendStatus(400);

        let dbData = [
            req.body.name,
            req.body.email,
            req.body.password,
            req.body.city,
            req.body.country
        ];

        let row = await User.insert(dbData);
        return res.status(201).send({'userId' : row.insertId});
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

exports.login = async function (req, res) {
    let data = [
        req.body.email,
        req.body.password
    ];

    try {
        let rows = await User.authenticate(data);
        // No such email
        if (rows == null) return res.sendStatus(400);
        // Incorrect password
        if (rows == false) return res.sendStatus(404);

        let userId = rows.user_id;
        let authToken = await User.checkAndSetToken(userId);

        return res.status(200).send({'userId' : userId, 'token' : authToken});
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

exports.logout = async function (req, res) {
    let token = req.get('X-Authorization');
    if (!token) return res.sendStatus(401);

    try {
        let userId = await User.getIdByToken(token);
        if (userId == null) return res.sendStatus(401);

        await User.deleteToken(userId);
        return res.sendStatus(200);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

exports.userById = async function (req, res) {
    try {
        let row = await User.getOne(req.params.id);
        if (row.length == 0) return res.sendStatus(404);

        let token = req.get('X-Authorization');
        let loggedInUserId = await User.getIdByToken(token);
        if (!token || loggedInUserId == null || row[0].user_id !== loggedInUserId) {
            delete row[0].email;
        }
        return res.status(200).send(row[0]);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

exports.update = async function (req, res) {
    let userId = parseInt(req.params.id);
    let token = req.get('X-Authorization');
    if (!token || !userId) {
        return res.sendStatus(401);
    }

    try {
        // Check authorization
        let loggedInUserId = await User.getIdByToken(token);
        if (loggedInUserId == null) return res.sendStatus(401);
        if (loggedInUserId !== userId) return res.sendStatus(403);

        let values = Object.assign({}, req.body);
        let dbUser = await User.getOne(userId);

        let hashPassword = true;
        let hasChanged = true;
        // Start some validation
        if (values.hasOwnProperty('name')) {
            if (values['name'] === '') return res.sendStatus(400);
        } else {
            values['name'] = dbUser[0].name;
        }
        if (values.hasOwnProperty('email')) {
            if (User.isValidEmail(req.body.email) === false) return res.sendStatus(400);
            if (dbUser[0].email !== req.body.email) {
                let exists = await User.emailExists(req.body.email);
                if (exists) return res.sendStatus(400);
            }
        } else {
            values['email'] = dbUser[0].email;
        }
        if (values.hasOwnProperty('password')) {
            if (values['password'] === '') {
                return res.sendStatus(400);
            } else {
                if (!hashing.verifyPassword(values['password'], dbUser[0].password)) {
                    // Password has been changed
                    if (!values.hasOwnProperty('currentPassword') || values['currentPassword'] === '') {
                        return res.sendStatus(400);
                    }
                }
            }
        } else {
            values['password'] = dbUser[0].password;
            hashPassword = false;
        }
        if (values.hasOwnProperty('city') == false) {
            values['city'] = dbUser[0].city;
        }
        if (values.hasOwnProperty('country') == false) {
            values['country'] = dbUser[0].country;
        }

        values['user_id'] = userId;
        let updated = await User.update(values, hashPassword);
        if (updated.changedRows == 0) return res.sendStatus(400);
        return res.sendStatus(200);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

exports.readPhoto = async function (req, res) {
    let userId = req.params.id;
    try {
        let row = await User.getOne(userId);
        if (row.length == 0 || row[0].photo_filename == null) return res.sendStatus(404);

        let filename = row[0].photo_filename;
        let filenameSplit = filename.split(".");
        let extension = filenameSplit[1];

        if (!fs.existsSync('storage/photos/' + filename)) return res.sendStatus(404);

        let image = fs.readFileSync('storage/photos/' + filename);
        return res.status(200).contentType('image/' + extension).send(image);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

exports.setPhoto = async function (req, res) {
    let userId = parseInt(req.params.id);
    let token = req.get('X-Authorization');
    let image = req.body;
    if (!token || !userId || !image) {
        return res.sendStatus(404);
    }

    try {
        let dbUserId = await User.getIdByToken(token);
        if (dbUserId == null) return res.sendStatus(401);
        if (dbUserId !== userId) return res.sendStatus(403);

        let user = await User.getOne(dbUserId);

        let imageSplit = req.headers['content-type'].split('/');
        let extension = imageSplit[1];
        if (extension.toLowerCase() == 'bmp') return res.sendStatus(400);

        let photoFileName = 'user_' + userId + '.' + extension;

        fs.appendFileSync('storage/photos/' + photoFileName, image);

        let added = await User.updatePhoto(photoFileName, userId);

        if (user[0].photo_filename == null) return res.sendStatus(201);
        // Unlink old photo
        fs.unlinkSync('storage/photos/' + user[0].photo_filename);
        return res.sendStatus(200);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

exports.deletePhoto = async function (req, res) {
    let userId = parseInt(req.params.id);
    let token = req.get('X-Authorization');
    if (!token || !userId) {
        return res.sendStatus(401);
    }

    try {
        let dbUserId = await User.getIdByToken(token);
        if (dbUserId == null) return res.sendStatus(401);
        if (dbUserId !== userId) return res.sendStatus(404);

        let user = await User.getOne(userId);
        let fileName = user[0].photo_filename;
        let deleted = await User.deletePhoto(userId);

        // Remove photo
        fs.unlinkSync('storage/photos/' + fileName);
        return res.sendStatus(200);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};
