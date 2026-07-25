import express from "express";
import { authorizeAdmin } from '../../middlewares/authMiddleware.js'
import {
  loginAdmin,
  logoutCurrentAdmin,
  getAllUsers,
  deleteUserById,
  getUserById,
  updateUserById,
  getDashboard,
  updateUserStatus
} from "../../controllers/admin/adminController.js";
import { getSalesReport, downloadSalesReport } from '../../controllers/admin/salesController.js';

const router = express.Router();


router.post("/login", loginAdmin);
router.post("/logout",  logoutCurrentAdmin);
router.get("/dashboard", authorizeAdmin, getDashboard);

router.get("/users", authorizeAdmin, getAllUsers);

router
  .route("/users/:id")
  .delete(authorizeAdmin, deleteUserById)
  .get(authorizeAdmin, getUserById)
  .put(authorizeAdmin, updateUserById);


router.put("/users/:id/status", authorizeAdmin, updateUserStatus);

router.get('/sales-report', authorizeAdmin, getSalesReport);
router.get('/sales-report/download', authorizeAdmin, downloadSalesReport);

export default router;
