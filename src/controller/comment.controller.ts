import {asyncHandler} from "../middleware/handlers/asyncHandler";
import {UserRequest} from "../utils/types/user.types";
import {NextFunction,Response} from "express";
import pool from "../config/db.config";


export const makeACommentOnAPost = asyncHandler(async (req:UserRequest,res:Response,next:NextFunction)=> {
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({
            message: "Not Authorized to do this"
        })
    }
    const {postId} = req.params;
    if(!postId) {
        res.status(401).json({
            message: "Invalid post Id"
        })
    }
    try {
        const {content} = req.body;


        const comment = await pool.query(`
        INSERT INTO public.comments ( post_id, content,user_id)  VALUES ($1,$2,$3) RETURNING id,post_id,content
        `,[postId,content,req.user?.id]);

        const newResult = comment.rows[0];

        res.status(200).json({
            message: "Comment made SuccessFull",
            newResult,
        })



    } catch (error) {
        console.error("Error Occurred",error)
        res.status(500).json({
            message:"Internal Server Error"
        })

    }
});

export const getAllCommentForAPost = asyncHandler(async (req:UserRequest,res:Response,next:NextFunction)=> {
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({
            message: "Not Authorized to do this"
        })
    }
    const {postId} = req.params;
    if(!postId) {
        res.status(401).json({
            message: "Invalid post Id"
        })
    }

    try{

        const result = await pool.query(` 
        SELECT * FROM public.comments  ORDER BY comments.created_at DESC 
         `,);

        if(result.rows.length === 0) {
            res.status(201).json({
                message: "Sorry There Are No comments yet"
            })
        }

        const NewResult = result.rows[0];

        res.status(200).json({
            message: "Here Are the comments for the Post",
            NewResult,

        })

    } catch (error) {
        console.error("Error Occurred",error)
        res.status(500).json({
            message:"Internal Server Error"
        })

    }

});

export const WhoPostedOnMyPost = asyncHandler(async (req: UserRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({
            message: "Not authorized",
        });
    }

    const { postId } = req.params;
    if (!postId) {
        return res.status(400).json({
            message: "Invalid post ID",
        });
    }

    try {
        // First check: does this post belong to the current user?
        const ownershipCheck = await pool.query(
            `SELECT * FROM posts WHERE id = $1 AND user_id = $2`,
            [postId, userId]
        );

        if (ownershipCheck.rows.length === 0) {
            return res.status(403).json({
                message: "You don't own this post or it doesn't exist",
            });
        }

        // Get all users who commented on this post
        const result = await pool.query(
            `
                SELECT
                    person.id,
                    person.first_name,
                    person.last_name,
                    comments.content,
                    comments.created_at
                FROM comments
                         INNER JOIN person ON comments.user_id = person.id
                WHERE comments.post_id = $1
                ORDER BY comments.created_at DESC
            `,
            [postId]
        );

        return res.status(200).json({
            message: "People who commented on your post",
            commenters: result.rows,
        });

    } catch (error) {
        console.error("Error occurred:", error);
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
});

export const deleteComment = asyncHandler(async (req: UserRequest, res: Response) => {
    const userId = req.user?.id;
    const roleId = req.user?.role_id; // assuming 1 = admin
    const commentId = req.params.id;

    if (!userId) {
        res.status(401).json({ message: "Not authorized" });
        return
    }

    if (!commentId) {
        res.status(400).json({ message: "Comment ID is required" });
        return
    }
    // console.log("User ID from token:", userId);
    // console.log("Role ID from token:", roleId);
    // console.log("Comment Owner ID:", commentId);


    try {
        // Step 1: Get the comment
        const { rows } = await pool.query(
            `SELECT * FROM comments WHERE id = $1`,
            [commentId]
        );

        const comment = rows[0];

        if (!comment) {
             res.status(404).json({ message: "Comment not found" });
            return
        }

        // Step 2: Check if user owns the comment OR is admin
        if (String(comment.user_id) !== String(userId) && Number(roleId) !== 1) {
            res.status(403).json({ message: "Unauthorized" });
            return;
        }


        // Step 3: Delete the comment
        await pool.query(`DELETE FROM comments WHERE id = $1`, [commentId]);

         res.status(200).json({ message: "Comment deleted successfully" });
        return

    } catch (error) {
        console.error("Error deleting comment:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

export const updateComment = asyncHandler(async (req: UserRequest, res: Response) => {
    const commentId = req.params.id;
    const { content } = req.body;
    const userId = req.user?.id;
    const roleId = req.user?.role_id;

    if (!userId || !roleId) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    if (!commentId || !content) {
        return res.status(400).json({ message: "Missing comment ID or content" });
    }

    try {
        // Check if comment exists and fetch owner
        const { rows } = await pool.query(
            `SELECT user_id FROM comments WHERE id = $1`,
            [commentId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Comment not found" });
        }

        const commentOwnerId = rows[0].user_id;

        // Only the owner or admin (assume roleId 1 = admin) can update
        if (String(commentOwnerId) !== String(userId) && roleId !== 1) {
            return res.status(403).json({ message: "Unauthorized to update this comment" });
        }

        // Update the comment
        const updateQuery = `
      UPDATE comments
      SET content = $1
      WHERE id = $2
      RETURNING *
    `;

        const { rows: updatedRows } = await pool.query(updateQuery, [content, commentId]);

        res.status(200).json({
            message: "Comment updated successfully",
            comment: updatedRows[0],
        });

    } catch (err) {
        console.error("Error updating comment:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
