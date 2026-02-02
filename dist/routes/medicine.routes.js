"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const medicine_controller_1 = require("../controllers/medicine.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const upload_middleware_1 = require("../middlewares/upload.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Routes
router.post('/', auth_middleware_1.authenticate, upload_middleware_1.upload.single('bill'), medicine_controller_1.addMedicine); // This was addMedicine
router.get('/', medicine_controller_1.getMedicines);
router.get('/:id', medicine_controller_1.getMedicineById);
router.delete('/:id', medicine_controller_1.deleteMedicine);
router.put('/:id', medicine_controller_1.updateMedicine);
router.post('/sell', medicine_controller_1.sellMedicines);
exports.default = router;
