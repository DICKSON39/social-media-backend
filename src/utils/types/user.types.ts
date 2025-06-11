import {Request} from 'express';


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

export interface UserRequest extends Request {
    user?: User;
}