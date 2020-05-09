const db = require('../../config/db');

exports.getAll = async function (data) {
    try {
        let dbData = [];
        let s = 'select p.petition_id as petitionId, p.title, c.name as category, ';
        s += ' u.name as authorName, COUNT(s.signatory_id) as signatureCount from Petition p ';
        s += ' left join Signature s on p.petition_id = s.petition_id ';
        s += ' left join Category c on p.category_id = c.category_id ';
        s += ' left join User u on p.author_id = u.user_id ';
        if (data['q'] || data['category_id'] || data['author_id']) {
            s += ' where ';
            let wheres = [];
            if (data['q']) {
                wheres.push(' p.title like ? ');
                dbData.push('%' + data['q'] + '%');
            }

            if (data['category_id']) {
                wheres.push(' p.category_id = ? ');
                dbData.push(data['category_id']);
            }

            if (data['author_id']) {
                wheres.push(' p.author_id = ? ');
                dbData.push(data['author_id']);
            }

            s += wheres.join(' and ');
        }
        s += ' group by p.title order by ' + data['sort'];
        if (data['start'] && data['end']) {
            s += ' limit ?, ?';
            dbData.push(parseInt(data['start']));
            dbData.push(parseInt(data['end']));
        }
        console.log(s);
        let [rows] = await db.getPool().query(s, dbData);
        return rows;
    } catch (err) {
        console.log(err.sql);
        throw err;
    }
};

exports.categoryExists = async function (categoryId) {
    try {
        let s =  'select category_id from Category where category_id = ?';
        let [row] = await db.getPool().query(s, [categoryId]);
        if (row.length >= 1) return true;
        return false;
    } catch (err) {
        console.log(err.sql);
        throw err;
    }
};

exports.insert = async function (data) {
    try {
        let s = 'insert into Petition(title, description, category_id, closing_date, author_id, created_date) values(?, ?, ?, ?, ?, NOW())';
        let [row] = await db.getPool().query(s, data);
        return row;
    } catch (err) {
        console.log(err.sql);
        throw err;
    }
};

exports.exists = async function (petitionId) {
    try {
        let s = 'select petition_id from Petition where petition_id = ?';
        let [row] = await db.getPool().query(s, [petitionId]);
        if (row.length >= 1) return true;
        return false;
    } catch (err) {
        console.log(err.sql);
        throw err;
    }
};

exports.getOne = async function (petitionId) {
    try {
        let s = 'select * from Petition where petition_id = ? limit 1';
        let [row] = await db.getPool().query(s, [petitionId]);
        return row;
    } catch (err) {
        console.log(err.sql);
        throw err;
    }
};

exports.getPetitionDetails = async function (petitionId) {
    try {
        let s = 'select p.petition_id as petitionId, p.title as title, c.name as category, u.name as authorName, ';
        s += 'count(s.signatory_id) as signatureCount, p.description as description, u.user_id as authorId, ';
        s += 'u.city as authorCity, u.country as authorCountry, p.created_date as createdDate, ';
        s += 'p.closing_date as closingDate from Petition p ';
        s += 'left join User u on p.author_id = u.user_id ';
        s += 'left join Signature s on p.petition_id = s.petition_id ';
        s += 'left join Category c on p.category_id = c.category_id ';
        s += 'where p.petition_id = ?';
        let [row] = await db.getPool().query(s, [petitionId]);
        return row;
    } catch (err) {
        console.log(err.sql);
        throw err;
    }
};

exports.delete = async function (petitionId) {
    try {
        let s = 'delete from Petition where petition_id = ?';
        let [row] = await db.getPool().query(s, [petitionId]);
        let s1 = 'delete from Signature where petition_id = ?';
        let [row2] = await db.getPool().query(s, [petitionId]);
        return true;
    } catch (err) {
        console.log(err.sql);
        throw err;
    }
};

exports.update = async function (data) {
    try {
        let s = 'update Petition set title = ?, description = ?, category_id = ?, closing_date = ? where petition_id = ?';
        let [row] = await db.getPool().query(s, data);
        return row;
    } catch (err) {
        console.log(err.sql);
        throw err;
    }
};

exports.getAllCategories = async function () {
    try {
        let s = 'select category_id as categoryId, name from Category';
        let [rows] = await db.getPool().query(s);
        return rows;
    } catch (err) {
        console.log(err.sql);
        throw err;
    }
};

exports.updatePhoto = async function (filename, petitionId) {
    try {
        let s = 'update Petition set photo_filename = ? where petition_id = ?';
        let [rows] = await db.getPool().query(s, [filename, petitionId]);
        return rows;
    } catch (err) {
        console.log(err.sql);
        throw err;
    }
};

exports.getSignatures = async function (petitionId) {
    try {
        let s = 'select s.signatory_id as signatoryId, u.name, u.city, u.country, s.signed_date as signedDate from Signature s'
        s += ' left join User u on s.signatory_id = u.user_id';
        s += ' left join Petition p on s.petition_id = p.petition_id';
        s += ' where p.petition_id = ? order by s.signed_date';
        let [rows] = await db.getPool().query(s, [petitionId]);
        return rows;
    } catch (err) {
        console.log(err.sql);
        throw err;
    }
};

exports.hasSigned = async function (petitionId, userId) {
    try {
        let s = 'select signatory_id from Signature where signatory_id = ? and petition_id = ?';
        let [rows] = await db.getPool().query(s, [userId, petitionId]);
        if (rows.length == 0) return false;
        return true;
    } catch (err) {
        console.log(err.sql);
        throw err;
    }
};

exports.sign = async function (petitionId, userId) {
    try {
        let conn = await db.getPool().getConnection();
        let now = new Date();
        let s = 'insert into Signature(signatory_id, petition_id, signed_date) values(?, ?, ?)';
        let [inserted] = await conn.query(s, [userId, petitionId, now]);
        conn.release();
        return inserted;
    } catch (err) {
        console.log(err.sql);
        throw err;
    }
};

exports.deleteSignature = async function (petitionId, userId) {
    try {
        let s = 'delete from Signature where signatory_id = ? and petition_id = ?';
        let [deleted] = await db.getPool().query(s, [userId, petitionId]);
        return deleted;
    } catch (err) {
        console.log(err.sql);
        throw err;
    }
};
