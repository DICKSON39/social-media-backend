import {asyncHandler} from "../middleware/handlers/asyncHandler";
import {UserRequest} from "../utils/types/user.types";
import {NextFunction,Response,Request} from "express";
import pool from "../config/db.config";


export interface User {
    id:number;
    first_name:string;
    last_name:string;
    email:string;
    password:string;
    gender:string;
    country_code:number;
    date_of_birth:Date;
    role_id:number;
    userId:number;
    roleId:number;
    role_name:string;


}

interface Usermain extends Request {
    query: {
        page?: string;
        pageSize?: string;
        searchTerm?: string;
    };
    user?: User;
}



export const getUsers = asyncHandler(async (req: Usermain, res: Response) => {


    const page = parseInt(req.query.page || "1");
    const pageSize = parseInt(req.query.pageSize || "100");
    const searchTerm = req.query.searchTerm?.toLowerCase() || "";

    const offset = (page - 1) * pageSize;

    let whereClause = "";
    const queryParams: any[] = [pageSize, offset];
    let paramIndex = 3;

    if (searchTerm) {
        whereClause = `
            WHERE
                LOWER(first_name) LIKE $${paramIndex} OR
                LOWER(last_name) LIKE $${paramIndex} OR
                LOWER(email) LIKE $${paramIndex}
        `;
        queryParams.push(`%${searchTerm}%`);
    }

    // COUNT query params
    const countQueryParams = searchTerm ? [queryParams[queryParams.length - 1]] : [];

    const countResult = await pool.query(
        `SELECT COUNT(p.id) FROM public.person p
                                     LEFT JOIN public.roles r ON p.role_id = r.id
            ${whereClause}`,
        searchTerm ? [queryParams[queryParams.length - 1]] : []
    );



    const totalItems = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalItems / pageSize);

    const result = await pool.query(
        `
            SELECT
                p.id,
                p.first_name,
                p.last_name,
                p.email,
                p.role_id,
                r.role_name
            FROM
                public.person p
                    LEFT JOIN
                public.roles r ON p.role_id = r.id
                    ${whereClause}
            ORDER BY p.id ASC
            LIMIT $1 OFFSET $2;
        `,
        queryParams
    );


    res.status(200).json({
        items: result.rows.map((row) => ({
            id: row.id,
            firstName: row.first_name,
            lastName: row.last_name,
            email: row.email,
            roleId: row.role_id,
            role_name: row.role_name || 'Unknown',
        })),
        totalItems,
        currentPage: page,
        pageSize,
        totalPages,
    });
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
export const getUserById = asyncHandler(async (req: UserRequest, res: Response) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
        res.status(400).json({ message: "Invalid user ID" });
        return;
    }
    const loggedInUserId = req.user?.id;
    const loggedInUserRole = req.user?.role_id;

    if (!loggedInUserId || !loggedInUserRole) {
        res.status(401).json({ message: "Unauthorized" });
        return
    }


    if (isNaN(userId)) {
        res.status(400).json({ message: "Invalid user ID" });
        return;
    }

    const query = `
    SELECT 
      p.id, 
      p.first_name, 
      p.last_name, 
      p.email, 
      p.role_id, 
      r.role_name
    FROM 
      public.person p
    LEFT JOIN 
      public.roles r ON p.role_id = r.id
    WHERE 
      p.id = $1;
  `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
        res.status(404).json({ message: "User not found" });
        return;
    }

    const user = result.rows[0];

    res.status(200).json({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role_id: user.role_id,
        role_name: user.role_name || "Unknown",
    });
})



