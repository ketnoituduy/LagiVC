const restaurantRouter = require('express').Router();
const restaurantController = require('../controllers/restaurantController');
//lay du lieu cac nha hang danh gia cao
restaurantRouter.get('/restaurants/bestRating/:khuvucId', restaurantController.getRestaurantsBestRating);
//lay du lieu cac nha hang pho bien
restaurantRouter.get('/restaurants/popularSelling/:khuvucId', restaurantController.getRestaurantsPopularSelling);
//lay du lieu tat ca nha hang
restaurantRouter.get('/restaurants/nearByRestaurant/:khuvucId/:latitude/:longitude', restaurantController.getRestaurants);
//Tim kiem cua hang
restaurantRouter.get('/restaurants/search/:userId/:khuvucId/:searchTerm', restaurantController.searchRestaurant);
//Tim kiem san pham
restaurantRouter.get('/products/search/:userId/:khuvucId/:searchTerm', restaurantController.searchProduct);
//Tim kiem nha hang tu san pham
restaurantRouter.get('/product/restaurant/:restaurantId', restaurantController.searchRestaurantFromProduct);
//San pham ban chay trong ngay
restaurantRouter.get('/bestSellerInDay/:khuvucId', restaurantController.bestSellerInDay);
//Go Product Card tu san pham ban chay
restaurantRouter.get('/productBestSellingInDay/:restaurantId/:productId', restaurantController.goProductBestSellerInDay);
//Lay du lieu categories tu products trong cua hang
restaurantRouter.get('/:restaurantId/products/getCategories', restaurantController.getCategoriesFromProducts);
//Lay du lieu san pham tu cua hang
restaurantRouter.get('/:restaurantId/products', restaurantController.getProductsFromRestaurant);
//lay du lieu products tu categoryId
restaurantRouter.get('/:restaurantId/products/:categoryId', restaurantController.getProductsFromCategory);
//lay du lieu nhung san pham ban chay theo category
restaurantRouter.get('/bestProducts/:khuvucId/:categoryId', restaurantController.getBestProductsFromCategory);
//lay du lieu khi scroll san pham category
restaurantRouter.get('/:restaurantId/products/loadMore/:categoryId', restaurantController.getScrollProductsFromCategory);
//Lay danh gia cua hang 
restaurantRouter.get('/:restaurantId/reviews', restaurantController.getReviewsRestaurant);
//dang ky cua hang
restaurantRouter.post('/dangkycuahang/:userId', restaurantController.createRestaurant);
//lay thong tin cua hang
restaurantRouter.get('/thongtincuahang/:userId', restaurantController.getInfoRestaurant);
//cap nhat active cua hang
restaurantRouter.post('/capnhatActiveCuahang/:restaurantId', restaurantController.updateActiveRestaurant);
//cap nhat cua hang
restaurantRouter.post('/capnhatcuahang/:restaurantId', restaurantController.updateRestaurant);
//Danh gia cua hang
restaurantRouter.post('/reviewRestaurant/:restaurantId/:orderId', restaurantController.reviewsRestaurant);
//lay du lieu san pham cua cua hang de cap nhat 
restaurantRouter.get('/products/:restaurantId', restaurantController.getUpdateProductsFromRestaurant);
//tao san pham 
restaurantRouter.post('/product/:restaurantId',restaurantController.createProduct);
// cap nhat active san pham
restaurantRouter.post('/products/active/:productId',restaurantController.updateActiveProduct);
//cap nhat san pham
restaurantRouter.post('/updateProduct/:productId',restaurantController.updateProduct);
//delete san pham
restaurantRouter.post('/deleteProduct/:productId',restaurantController.deleteProduct);
//lay du lieu cua hang tu danh sach nha hang
restaurantRouter.get('/restaurants/:id',restaurantController.getRestaurantFromRestaurants);
//lay du lieu supportShip tu nha hang
restaurantRouter.get('/getSupportShip/:id',restaurantController.getSupportShipFromRestaurant);
//cap nhat du lieu supportShip
restaurantRouter.post('/updateSupportShip/:id',restaurantController.updateSupportShipFromRestaurant);
//lay du lieu doanh thu cua hang
restaurantRouter.get('/getRevenueRestaurant/:id/:mode/:date/:year/:month',restaurantController.getRevenueRestaurant);
//lay danhmucduocchon
restaurantRouter.get('/getDanhmucduocchon/:khuvucId',restaurantController.getDanhmucduocchon);

module.exports = restaurantRouter;