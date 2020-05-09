const petitions = require('../controllers/petitions.controller');

module.exports = function (app) {
    app.route(app.rootUrl + '/petitions/categories')
        .get(petitions.allCategories);

    app.route(app.rootUrl + '/petitions')
        .get(petitions.all)
        .post(petitions.create);

    app.route(app.rootUrl + '/petitions/:id')
        .get(petitions.petitionsById)
        .patch(petitions.update)
        .delete(petitions.delete);

    app.route(app.rootUrl + '/petitions/:id/photo')
        .get(petitions.heroImage)
        .put(petitions.setHeroImage);

    app.route(app.rootUrl + '/petitions/:id/signatures')
        .get(petitions.petitionSignature)
        .post(petitions.signSignature)
        .delete(petitions.deleteSignature);
};
