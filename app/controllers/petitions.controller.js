const Petition = require('../models/petitions.model');
const User = require('../models/users.model');
const fs = require('fs');

exports.all = async function (req, res) {
    let data = {
        'start' : req.query.startIndex,
        'end' : req.query.count,
        'q' : req.query.q,
        'category_id' : req.query.categoryId,
        'author_id' : req.query.authorId,
        'sort' : req.query.sortBy
    };

    if (!data['start']) {
        data['start'] = 0;
    }

    if (!data['end']) {
        // That will need to be changed
        data['end'] = 10;
    } else {
        if (data['start'] !== data['end']) {
            data['end'] = data['start'] + data['end'];
        }
    }

    if (data['sort'] == 'ALPHABETICAL_ASC') {
        data['sort'] = 'p.title asc';
    } else if (data['sort'] == 'ALPHABETICAL_DESC') {
        data['sort'] = 'p.title desc';
    } else if (data['sort'] == 'SIGNATURES_ASC') {
        data['sort'] = 'signatureCount asc';
    } else if (data['sort'] == 'SIGNATURES_DESC') {
        data['sort'] = 'signatureCount desc';
    } else {
        data['sort'] = 'signatureCount desc';
    }

    try {
        let all = await Petition.getAll(data);
        return res.status(200).send(all);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

exports.create = async function (req, res) {
    try {
        let token = req.get('X-Authorization');
        let userId = await User.isLoggedIn(false, token);
        if (userId == null) return res.sendStatus(401);

        // Check date in future and category exists
        let catExists = await Petition.categoryExists(req.body.categoryId);
        if (!catExists) return res.sendStatus(400);

        if (req.body.hasOwnProperty('title') == false || req.body.title === '') {
            return res.sendStatus(400);
        }

        if (req.body.closingDate) {
            let now = new Date();
            let closingDate = new Date(req.body.closingDate);
            if (closingDate < now) return res.sendStatus(400);
        }

        let dbData = [
            req.body.title,
            req.body.description,
            req.body.categoryId,
            req.body.closingDate,
            userId
        ];

        let row = await Petition.insert(dbData);
        return res.status(201).send({'petitionId' : row.insertId});
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

exports.petitionsById = async function (req, res) {
    try {
        let id = req.params.id;
        let petition = await Petition.getPetitionDetails(id);
        if (petition.length == 0) return res.sendStatus(404);
        return res.status(200).send(petition[0]);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

exports.update = async function (req, res) {
    try {
        let now = new Date();

        let petitionId = req.params.id;

        let userId = await User.isLoggedIn(false, req.get('X-Authorization'));
        if (userId == null) return res.sendStatus(401);

        let petition = await Petition.getOne(petitionId);
        if (petition.length == 0) return res.sendStatus(404);
        if (petition[0].author_id !== userId) return res.sendStatus(403);

        if (petition[0].closing_date) {
            let dbClosingDate = new Date(petition[0].closing_date);
            if (dbClosingDate < now) return res.sendStatus(403);
        }

        let values = Object.assign({}, req.body);
        if (values.hasOwnProperty('title')) {
            if (values['title'] === '') return res.sendStatus(400);
        } else {
            values['title'] = petition[0].title;
        }

        if (values.hasOwnProperty('description')) {
            if (values['description'] === '') return res.sendStatus(400);
        } else {
            values['description'] = petition[0].description;
        }

        if (values.hasOwnProperty('categoryId')) {
            if (values['categoryId'] === '') return res.sendStatus(400);
            let catExists = await Petition.categoryExists(values['categoryId']);
            if (!catExists) return res.sendStatus(400);
        } else {
            values['categoryId'] = petition[0].category_id;
        }

        if (values.hasOwnProperty('closingDate')) {
            if (values['closingDate'] === '') return res.sendStatus(400);
            let closingDate = new Date(values['closingDate']);
            if (closingDate < now) return res.sendStatus(400);
        } else {
            values['closingDate'] = petition[0].closing_date;
        }

        let dbData = [
            values['title'],
            values['description'],
            values['categoryId'],
            values['closingDate'],
            petitionId
        ];

        let updated = await Petition.update(dbData);
        return res.sendStatus(200);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

exports.delete = async function (req, res) {
    try {
        let petitionId = req.params.id;

        let userId = await User.isLoggedIn(false, req.get('X-Authorization'));
        if (userId == null) return res.sendStatus(401);

        let petition = await Petition.getOne(petitionId);
        if (petition.length == 0) return res.sendStatus(404);
        if (petition[0].author_id !== userId) return res.sendStatus(403);

        let deleted = await Petition.delete(petitionId);
        return res.sendStatus(200);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

exports.allCategories = async function (req, res) {
    try {
        let categories = await Petition.getAllCategories();
        return res.status(200).send(categories);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

exports.heroImage = async function (req, res) {
    try {
        let petitionId = req.params.id;
        let petition = await Petition.getOne(petitionId);

        if (petition.length == 0) return res.sendStatus(404);
        if (petition[0].photo_filename == null) return res.sendStatus(404);

        let filename = petition[0].photo_filename;
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

exports.setHeroImage = async function (req, res) {
    try {
        let petitionId = req.params.id;
        let image = req.body;

        let userId = await User.isLoggedIn(false, req.get('X-Authorization'));
        if (userId == null) return res.sendStatus(401);

        let petition = await Petition.getOne(petitionId);
        if (petition.length == 0) return res.sendStatus(404);
        if (petition[0].author_id !== userId) return res.sendStatus(403);

        let imageSplit = req.headers['content-type'].split('/');
        let extension = imageSplit[1];
        if (!extension.match(/(jpg|jpeg|png|gif)$/i)) return res.sendStatus(400);

        let photoFileName = 'petition_' + petitionId + '.' + extension;

        fs.appendFileSync('storage/photos/' + photoFileName, req.body);
        let added = await Petition.updatePhoto(photoFileName, petitionId);

        if (petition[0].photo_filename == null) return res.sendStatus(201);
        // Unlink old file
        fs.unlinkSync('storage/photos/' + petition[0].photo_filename);
        return res.sendStatus(200);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

exports.petitionSignature = async function (req, res) {
    try {
        let petitionId = req.params.id;
        let exists = await Petition.exists(petitionId);
        if (exists == false) return res.sendStatus(404);

        let signatures = await Petition.getSignatures(petitionId);
        return res.status(200).send(signatures);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

exports.signSignature = async function (req, res) {
    try {
        let petitionId = req.params.id;

        let userId = await User.isLoggedIn(false, req.get('X-Authorization'));
        if (userId == null) return res.sendStatus(401);

        let petition = await Petition.getOne(petitionId);
        if (petition.length == 0) return res.sendStatus(404);

        let hasSigned = await Petition.hasSigned(petitionId, userId);
        if (hasSigned) return res.sendStatus(403);

        if (petition[0].closing_date) {
            let now = new Date();
            let dbClosingDate = new Date(petition[0].closing_date);
            if (dbClosingDate < now) return res.sendStatus(403);
        }

        let added = await Petition.sign(petitionId, userId);
        return res.sendStatus(201);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

exports.deleteSignature = async function (req, res) {
    try {
        let petitionId = req.params.id;

        let userId = await User.isLoggedIn(false, req.get('X-Authorization'));
        if (userId == null) return res.sendStatus(401);

        let petition = await Petition.getOne(petitionId);
        if (petition.length == 0) return res.sendStatus(404);
        if (petition[0].author_id == userId) return res.sendStatus(403);

        let hasSigned = await Petition.hasSigned(petitionId, userId);
        if (hasSigned == false) return res.sendStatus(403);

        if (petition[0].closing_date) {
            let now = new Date();
            let dbClosingDate = new Date(petition[0].closing_date);
            if (dbClosingDate < now) return res.sendStatus(403);
        }

        let removed = await Petition.deleteSignature(petitionId, userId);
        return res.sendStatus(200);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};
