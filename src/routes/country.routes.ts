import express from 'express';
import {protect} from "../middleware/auth/protect.auth";
import {Admin} from "../middleware/rolesMiddleware/role.middleware";
import {addCountry, deleteMyCountry, getAvailableCountry, updateCountry} from "../controller/country.controller";

const router = express.Router();
router.post('/',protect,Admin,addCountry);
router.get('/',protect,getAvailableCountry);
router.delete('/country/:id',protect,Admin,deleteMyCountry);
router.put('/country/:id',protect,Admin,updateCountry);



export default router;