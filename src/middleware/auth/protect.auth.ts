import jwt from "jsonwebtoken";
import pool from '../../config/db.config';
import { NextFunction, Response } from "express";
import {UserRequest} from "../../utils/types/user.types";
import {asyncHandler} from "../handlers/asyncHandler";

export const protect = asyncHandler(
    async (req: UserRequest, res: Response, next: NextFunction) => {
        let token;

        // 1. Get token from header (Bearer) or cookie
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer")
        ) {
            token = req.headers.authorization.split(" ")[1];
        } else if (req.cookies?.access_token) {
            token = req.cookies.access_token;
        }

        if (!token) {
             res.status(401).json({ message: "No token provided" });
            return
        }

        try {
            if (!process.env.JWT_SECRET) {
                throw new Error("JWT_SECRET is not defined in env variables");
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
                userId: string;
                roleId: number;
            };

            const userQuery = await pool.query(
                `
                    SELECT
                        person.id,
                        person.first_name,
                        person.email,
                        person.role_id,
                        roles.role_name
                    FROM person
                             JOIN roles ON person.role_id = roles.role_id
                    WHERE person.id = $1
                `,
                [decoded.userId]
            );
            //console.log("Decoded user from token:", decoded);


            if (userQuery.rows.length === 0) {
                res.status(401).json({ message: "User not found" });
                return;
            }

            req.user = userQuery.rows[0];
            next();
        } catch (error) {
            console.error("JWT Error:", error);
             res
                .status(401)
                .json({ message: "Not authorized, token verification failed" });
            return;
        }
    }
);
