const bcrypt = require('bcrypt');

exports.getHashedPassword = function (password) {
    return bcrypt.hashSync(password, 10);
}

exports.verifyPassword = function (plain, hashed) {
    return bcrypt.compareSync(plain, hashed);
}
