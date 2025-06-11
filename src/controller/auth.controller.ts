import { NextFunction, Request, Response } from "express";
import {asyncHandler} from "../middleware/handlers/asyncHandler";
import pool from '../config/db.config';
import bcrypt from "bcryptjs";
import {generatetoken} from "../utils/helpers/generateToken";


//Registering users to this

export const registerUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const client = await pool.connect();
    try {
        const { first_name, last_name, gender, date_of_birth, email, password, countryCode, roleId, inviteCode } = req.body;

        if (!first_name || !last_name || !gender || !date_of_birth || !email || !password || !countryCode) {
             res.status(400).json({ message: "All fields must have an input" });
            return
        }

        let roleIdToUse = roleId || 2;

        if (inviteCode) {
            const inviteResult = await client.query(
                `SELECT role_id FROM public.invitecode WHERE code = $1`,
                [inviteCode]
            );

            if (inviteResult.rows.length === 0) {
                 res.status(400).json({ message: "Invalid invite code" });
                return
            }

            roleIdToUse = inviteResult.rows[0].role_id;
        }

        const emailChecking = await client.query(
            "SELECT id FROM public.person WHERE email = $1",
            [email]
        );
        if (emailChecking.rows.length > 0) {
            res.status(400).json({ message: "User already exists" });
            return
        }

        await client.query("BEGIN");

        const hashedPassword = await bcrypt.hash(password, 10);

        const insertNewUserResult = await client.query(
            `INSERT INTO public.person(first_name, last_name, gender, date_of_birth, email, password, country_code, role_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, first_name, last_name, gender, date_of_birth, email, role_id`,
            [first_name, last_name, gender, date_of_birth, email, hashedPassword, countryCode, roleIdToUse]
        );

        await client.query("COMMIT");

        res.status(201).json({
            message: "User created successfully",
            user: insertNewUserResult.rows[0],
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Registration error:", error);
         res.status(500).json({ message: "Server error" });
        return
    } finally {
        client.release();
    }
});
export const loginUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({ message: "Please enter a valid email and password" });
        return;
    }

    const userQuery = await pool.query(
        `SELECT id, email, password, first_name, last_name, gender, date_of_birth, role_id 
     FROM public.person 
     WHERE email = $1`,
        [email]
    );

    if (userQuery.rows.length === 0) {
        res.status(401).json({ message: "Invalid email or password" });
        return;
    }

    const user = userQuery.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        res.status(401).json({ message: "Invalid email or password" });
        return;
    }

    const { accessToken } = await generatetoken(res, user.id, user.role_id);

    res.status(200).json({
        message: "User logged in successfully",
        user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            gender: user.gender,
            date_of_birth: user.date_of_birth,
            role_id: user.role_id,
        },
        accessToken,
    });
});
export const logoutUser = asyncHandler(async (req: Request, res: Response, ) => {
    res.cookie("access_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        sameSite: "strict",
        expires: new Date(0),
    });

    res.cookie("refresh_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        sameSite: "strict",
        expires: new Date(0),
    });

    res.status(200).json({ message: "User logged out successfully" });
});
