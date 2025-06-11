import {asyncHandler} from "../handlers/asyncHandler";
import {RoleRequest} from "../../utils/types/role.types";
import {NextFunction,Response} from "express";
import {UserRequest} from "../../utils/types/user.types";


export const roleGuards = (allowedRoles:string[]) => {
    return asyncHandler(
        async (req:RoleRequest,res:Response,next:NextFunction)=> {
            if(!req.user || !allowedRoles.includes(req.user.role_name)){
                res.status(400).json({ message: "Access denied: Insufficient permissions" });
                return;
            }
            next();

        }
    )
}

export const Admin = roleGuards(['Admin']);
export const User = roleGuards(['User']);
export const Dickson = roleGuards(['Dickson']);


export const AdminOrUser = (
    req: UserRequest,
    res: Response,
    next: NextFunction,
) => {
    // Admin can update any user
    if (
        req.user?.role_name === "Admin" ||
        req.user?.role_name === "User"
    ) {
        return next();
    }

    res
        .status(403)
        .json({ message: "You are not authorized to Do This" });
};

export const AdminOrTeacher = (
    req: UserRequest,
    res: Response,
    next: NextFunction,
) => {
    if (req.user?.role_name === "Admin" || req.user?.role_name === "Dickson") {
        next();
    } else {
        res
            .status(403)
            .json({ message: "Access denied: Insufficient permissions" });
    }
};


