const adminController = require('../controllers/adminController');

const adminRouter = require('express').Router();
adminRouter.get('/admin/getRestaurants',adminController.getRestaurants);
adminRouter.post('/admin/restaurants/active/:restaurantId',adminController.updateActiveRestaurant);
adminRouter.get('/admin/getDelivers',adminController.getDelivers);
adminRouter.post('/admin/delivers/active/:deliverId',adminController.updateActiveDeliver);
adminRouter.post('/admin/deliver/:deliverId',adminController.updateDeliver);
adminRouter.post('/admin/login/:email',adminController.loginAdmin);
adminRouter.delete('/admin/deleteDeliver/:deliverId',adminController.deleteDeliver);
adminRouter.delete('/admin/deleteRestaurant/:restaurantId',adminController.deleteRestaurant);

module.exports = adminRouter;