import {asyncHandler} from "../middleware/handlers/asyncHandler";
import {UserRequest} from "../utils/types/user.types";
import {NextFunction,Response} from "express";
import pool from "../config/db.config";


export const getUsers= asyncHandler(async (req:UserRequest,res:Response,next:NextFunction)=> {
    const userId = req.user?.id;
    const roleId = req.user?.role_id;

    if (!userId || !roleId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }


    try {
        //Only Admin can get this info;
        if ( roleId !== 1) {
            res.status(403).json({ message: "Unauthorized to update this comment" });
            return;
        }

        const result = await pool.query(`
    SELECT 
     person.id,
        person.first_name,
        person.last_name,
        person.email,
        person.country_code
        
        FROM person JOIN public.country c on c.country_code = person.country_code
    
    
    
    
     `);

        const finalResult = result.rows;

        res.status(200).json({
            message: "Users Fetched SuccessFully",
            users: finalResult,
        })
        
    } catch (error) {
        console.error("Error Occurred sir",error);
        res.status(500).json({
            message: "Internal Server Error",
        })
        
    }
});

export const deleteUser = asyncHandler(async (req:UserRequest,res:Response,next:NextFunction)=> {
    const adminId = req.user?.id;
    const roleId = req.user?.role_id;
    const {userId} = req.params;

    if (!adminId|| !roleId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    if(!userId) {
        res.status(401).json({ message: "Invalid User Id" });
        return;
    }
    // console.log(userId);
    // console.log(roleId);
    // console.log(adminId);



    try {

        //Only Admin can get this info;
        if ( roleId !== 1) {
            res.status(403).json({ message: "Unauthorized to update this comment" });
            return;
        }

        const queryResult = await pool.query(' SELECT FROM public.person ');

        if(queryResult.rows.length === 0) {
            res.status(400).json ({
                message: "User Not Found"
            })
            return;
        }



        const deleteUser = await pool.query(`DELETE FROM public.person WHERE id=$1 RETURNING *`,[userId]);

        res.status(200).json({
            message: "User Deleted Successfully",
            deleteUser,

        })


    } catch (error) {
        console.error("Error Occurred sir",error);
        res.status(500).json({
            message: "Internal Server Error",
        })
    }
})

export const updateUser = asyncHandler(async (req: UserRequest, res: Response, next: NextFunction) => {
    const client = await pool.connect();
    const loggedInUserId = req.user?.id;
    const loggedInUserRole = req.user?.role_id;

    if (!loggedInUserId || !loggedInUserRole) {
         res.status(401).json({ message: "Unauthorized" });
        return
    }

    try {
        const targetUserId = req.params.userId; // assuming you're passing user ID in params like /users/:userId
        const {
            first_name,
            last_name,
            gender,
            date_of_birth,
            email,
            password,
            countryCode,
            roleId,
        } = req.body;

        // 🛡️ Check access rights
        if (String(loggedInUserId) !== targetUserId && loggedInUserRole !== 1) {
            res.status(403).json({ message: "You can't update someone else's profile" });
            return
        }

        // ❌ If not admin, prevent role update
        const updateRoleId = loggedInUserRole === 1 ? roleId : undefined;

        // 🧠 Optional: prevent email duplication
        if (email) {
            const emailChecking = await client.query(
                "SELECT id FROM public.person WHERE email = $1 AND id != $2",
                [email, targetUserId]
            );
            if (emailChecking.rows.length > 0) {
                res.status(400).json({ message: "Email already in use by another account" });
                return
            }
        }

        // 🔐 Hash password if it's being updated
        let hashedPassword = undefined;
        if (password) {
            const bcrypt = require("bcryptjs");
            hashedPassword = await bcrypt.hash(password, 10);
        }

        const result = await client.query(
            `
    UPDATE public.person
    SET 
      first_name = COALESCE($1, first_name),
      last_name = COALESCE($2, last_name),
      gender = COALESCE($3, gender),
      date_of_birth = COALESCE($4, date_of_birth),
      email = COALESCE($5, email),
      password = COALESCE($6, password),
      country_code = COALESCE($7, country_code),
      role_id = COALESCE($8, role_id)
    WHERE id = $9
    RETURNING id, first_name, last_name, email, gender, date_of_birth, country_code, role_id
    `,
            [
                first_name,
                last_name,
                gender,
                date_of_birth,
                email,
                hashedPassword,
                countryCode,
                updateRoleId, // will be `undefined` if not admin — so original value remains
                targetUserId,
            ]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ message: "User not found" });
            return
        }

        res.status(200).json({
            message: "User updated successfully",
            user: result.rows[0],
        });

    }catch (error) {
        console.error("Error Occurred sir",error);
        res.status(500).json({
            message: "Internal Server Error",
        })

    }


});

