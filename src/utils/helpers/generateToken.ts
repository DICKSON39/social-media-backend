import jwt from "jsonwebtoken";
import { Response } from "express";
import dotenv from "dotenv";

dotenv.config();

export const generatetoken = (
    res: Response,
    userId: string,
    roleId: number,
) => {
    const jwtSecret = process.env.JWT_SECRET;
    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

    if (!jwtSecret || !refreshTokenSecret) {
        throw new Error("JwtSecret or RefreshTokenSecret must be provided");
    }

    try {
        // Short access token (20 minutes)
        const accessToken = jwt.sign({ userId, roleId }, jwtSecret, {
            expiresIn: "20min",
        });

        // Long refresh token (30 days)
        const refreshToken = jwt.sign({ userId, roleId }, refreshTokenSecret, {
            expiresIn: "30d",
        });

        // Set access token as cookie
        res.cookie("access_token", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 20 * 60 * 1000, // 20 minutes
        });

        // Set refresh token as cookie
        res.cookie("refresh_token", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        return { accessToken, refreshToken };
    } catch (error) {
        console.error("Error generating JWT:", error);
        throw new Error("Error generating authentication tokens");
    }

}
