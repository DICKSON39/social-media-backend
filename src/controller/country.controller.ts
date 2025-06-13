import {asyncHandler} from "../middleware/handlers/asyncHandler";
import {UserRequest} from "../utils/types/user.types";
import {NextFunction,Response} from "express";
import pool from "../config/db.config";


export const addCountry = asyncHandler(async (req:UserRequest,res:Response,next:NextFunction)=> {
    const userId = req.user?.id;
    const roleId = req.user?.role_id;
    if (!userId || !roleId) {
        res.status(400).json({ message: "Not Authorized" });
        return
    }

    try {
        if ( roleId !== 1) {
            res.status(403).json({ message: "Unauthorized to update this comment" });
            return;
        }


        const {country_code,capital_city,country_name,} = req.body;
        if(!country_code || !capital_city || !country_name) {
            res.status(400).json({
                message: "All fields Are required"
            })
            return;
        }
        const ifCountryExist = await pool.query('SELECT FROM public.country WHERE country_code=$1', [country_code]);

        if(ifCountryExist.rows.length > 0) {
             res.status(400).json({
                 message: 'Country with that code already exists'
             })
         }

        const result = await pool.query(
            `
                INSERT INTO public.country (country_name, capital_city, country_code)
                VALUES ($1, $2, $3)
                RETURNING *
            `,
            [country_name, capital_city, country_code]
        );


        const newCountry = result.rows;
         res.status(200).json({
             message: "Country Created Successfully",
             newCountry,
         })
    } catch (error) {

        console.error(error);
        res.status(500).json({
            message: "Something went wrong",
        })

    }

});
export  const getAvailableCountry = asyncHandler(async (req:UserRequest,res:Response,next:NextFunction)=> {
    const userId = req.user?.id;

    if (!userId ) {
        res.status(400).json({ message: "Not Authorized" });
        return
    }
    try {


        const checkCountry = await pool.query("SELECT * FROM public.country ")

        const result = checkCountry.rows;

        res.status(200).json({
            message: "Country Fetched SuccessFully",
            result,
        })
    } catch (error) {
        console.error("Error Fetching Countries",error);
        res.status(500).json({
            message: "Internal Server Error"
        })

    }

});
export const deleteMyCountry = asyncHandler(async (req:UserRequest,res:Response,nex:NextFunction)=> {
    const userId = req.user?.id;
    const roleId = req.user?.role_id;
    const {id} = req.params;
    if (!userId || !roleId) {
        res.status(400).json({ message: "Not Authorized" });
        return
    }

    try {
        if ( roleId !== 1) {
            res.status(403).json({ message: "Unauthorized to update this comment" });
            return;
        }

        const ifCountryExist = await pool.query('SELECT FROM public.country ',)
        if(ifCountryExist.rows.length === 0) {
            res.status(400).json({
                message: 'Country does not exists'
            })
        }

        const deleteCountry = await pool.query(` DELETE FROM public.country WHERE id=$1 RETURNING *`,[id]);

        const result = deleteCountry.rows;

        res.status(200).json({
            message: "Country Deleted SuccessFully",
            result,
        })



    } catch (error) {
        console.error("Error Fetching Countries",error);
        res.status(500).json({
            message: "Internal Server Error"
        })

    }

});
export const updateCountry = asyncHandler(async (req:UserRequest,res:Response,next:NextFunction)=> {
    const userId = req.user?.id;
    const roleId = req.user?.role_id;
    const {id} = req.params;
    if (!userId || !roleId) {
        res.status(400).json({ message: "Not Authorized" });
        return;

    }
    try {
        const {country_code,capital_city,country_name} = req.body;
        if ( roleId !== 1) {
            res.status(403).json({ message: "Unauthorized to update this country" });
            return;
        }

        const ifCountryExist = await pool.query('SELECT FROM public.country WHERE country_code=$1', [country_code]);
        if(ifCountryExist.rows.length === 0) {
            res.status(400).json({
                message: 'Country with that code Does not exists'
            })
        }

        const updateCountry = await pool.query(` 
UPDATE public.country 
SET
    country_code = COALESCE($1, country_code)
        ,capital_city =
        COALESCE($2, capital_city),
    country_name= 
    COALESCE($3,country_name)
    
WHERE id=$4 RETURNING *`,
            [country_code,capital_city,country_name,id]);


        const result = updateCountry.rows;
        res.status(200).json({
            message: "Country Updated Successfully",
            result,
        })


    } catch (error) {
        console.error("Error Fetching Countries",error);
        res.status(500).json({
            message: "Internal Server Error"
        })

    }
});