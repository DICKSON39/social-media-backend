import express from 'express';
import {Admin, AdminOrUser} from "../middleware/rolesMiddleware/role.middleware";
import {deleteUser, getUsers, updateUser} from "../controller/user.controller";
import {protect} from "../middleware/auth/protect.auth";


const router = express.Router();

router.get('/',protect,Admin,getUsers);
router.delete('/delete/:userId',protect,Admin,deleteUser);
router.put('/update/:userId',protect,AdminOrUser,updateUser)



export default router;