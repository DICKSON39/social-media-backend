import { Request } from "express";

export interface UserRole {
    id: number;
    first_name: string;
    last_name: string;
}

export interface RoleRequest extends Request {
    user?: {
        id: number;
        first_name: string;
        last_name: string;
        email: string;
        roleId: number;
        role_name: string;
    }
}