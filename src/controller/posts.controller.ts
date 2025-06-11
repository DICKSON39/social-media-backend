import {asyncHandler} from "../middleware/handlers/asyncHandler";
import {NextFunction,Response,Request} from "express";
import {UserRequest} from "../utils/types/user.types";
import pool from "../config/db.config";
import { v4 as uuid } from "uuid";
import { supabase } from "../utils/supabaseClient";




// Assuming your existing createPost endpoint in Node.js
export const createPost = asyncHandler(async (req: UserRequest, res: Response, next: NextFunction) => {
    const { title, content } = req.body;
    const userId = req.user?.id;

    if (!userId) {
         res.status(401).json({ message: "Authentication required: User ID not found." });
        return
    }

    if (!title || !content) {
         res.status(400).json({ message: "Title and content are required." });
        return
    }

    let image_url: string | null = null;

    // Upload image to Supabase Storage
    if (req.file) {
        const fileExt = req.file.originalname.split(".").pop();
        const fileName = `${uuid()}.${fileExt}`;
        const filePath = `posts/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from("myfiles")
            .upload(filePath, req.file.buffer, {
                contentType: req.file.mimetype,
            });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
            .from("myfiles")
            .getPublicUrl(filePath);

        image_url = publicUrlData.publicUrl;
    }

    // Insert post into Supabase DB
    const { data, error } = await supabase
        .from("posts")
        .insert([
            {
                user_id: userId,
                title,
                content,
                image_url,
            },
        ])
        .select()
        .single();

    if (error) {
        console.error("Error creating post:", error);
         res.status(500).json({ message: "Failed to create post." });
        return
    }

    res.status(201).json({
        message: "Post created successfully",
        post: data,
    });
});

export const deletePost = asyncHandler(async (req: UserRequest, res: Response, next: NextFunction) => {
        const userId = req.user?.id;
        const { postId } = req.params;
        const roleId = req.user?.role_id;


    // console.log("Backend Delete Post Request:"); // <--- ADD THIS
    // console.log("  Authenticated User ID:", userId); // <--- ADD THIS
    // console.log("  Authenticated User Role ID:", roleId); // <--- ADD THIS
    // console.log("  Received Post ID from params:", postId); // <--- ADD THIS

        if (!userId) {
             res.status(400).json({ message: "User not found" });
            return
        }

        if (!postId) {
             res.status(400).json({ message: "Post ID is required" });
            return
        }

    try {
        // console.log(`  Querying for post with ID: ${postId} in database.`);
        const postQueryResult = await pool.query(
            `SELECT user_id FROM posts WHERE id = $1`,
            [postId]
        );

        const post = postQueryResult.rows[0];

        if (!post) {
            // console.warn(`  Post with ID ${postId} not found in database (404).`); // Add this log
            return res.status(404).json({ message: "Post not found." });
        }

        const isOwner = String(post.user_id) === String(userId);
        const isAdmin = Number(roleId) === 1;



        if (!isOwner && !isAdmin) {
            // console.warn("  Authorization failed (403): Not owner and not admin."); // Add this log
            return res.status(403).json({ message: "Forbidden: You are not authorized to delete this post." });
        }


        await pool.query(`DELETE FROM posts WHERE id = $1`, [postId]);


        res.status(200).json({
            message: "Post successfully deleted.",
        });

    } catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Something went wrong",
            })


        }

    });

export const getAllPosts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        // 1. Fetch posts with authors and image_url
        const { rows: posts } = await pool.query(
            `
            SELECT
                p.id AS post_id,
                p.title,
                p.content,
                p.image_url,
                p.created_at AS post_created_at,
                p.updated_at AS post_updated_at,

                u.id AS author_id,
                u.first_name AS author_first_name,
                u.last_name AS author_last_name,
                u.email AS author_email
            FROM posts p
            JOIN person u ON p.user_id = u.id
            ORDER BY p.created_at DESC
            `
        );

        if (posts.length === 0) {
            return res.status(200).json({
                message: "No posts available",
                posts: []
            });
        }

        // 2. Get all comments linked to post IDs
        const postIds = posts.map(post => post.post_id);

        const { rows: comments } = await pool.query(
            `
            SELECT
                c.id AS comment_id,
                c.post_id,
                c.content AS comment_content,
                c.created_at AS comment_created_at,

                u.id AS commenter_id,
                u.first_name AS commenter_first_name,
                u.last_name AS commenter_last_name,
                u.email AS commenter_email
            FROM comments c
            JOIN person u ON c.user_id = u.id
            WHERE c.post_id = ANY($1::int[])
            ORDER BY c.created_at ASC
            `,
            [postIds]
        );

        // 3. Format post & attach comments
        const postsWithComments = posts.map(post => {
            const postComments = comments
                .filter(c => c.post_id === post.post_id)
                .map(c => ({
                    id: c.comment_id,
                    content: c.comment_content,
                    created_at: c.comment_created_at,
                    commenter: {
                        id: c.commenter_id,
                        first_name: c.commenter_first_name,
                        last_name: c.commenter_last_name,
                        email: c.commenter_email,
                    },
                }));

            return {
                id: post.post_id,
                title: post.title,
                content: post.content,
                image_url: post.image_url ?? null, // Fallback to null
                created_at: post.post_created_at,
                updated_at: post.post_updated_at,
                author: {
                    id: post.author_id,
                    first_name: post.author_first_name,
                    last_name: post.author_last_name,
                    email: post.author_email,
                },
                comments: postComments,
            };
        });

        return res.status(200).json({
            message: "Posts with comments successfully fetched",
            posts: postsWithComments,
        });
    } catch (error) {
        console.error("Error fetching posts with comments:", error);
        return res.status(500).json({
            message: "Something went wrong while fetching posts.",
            error: error instanceof Error ? error.message : String(error),
        });
    }
});


export const getAllPostByUser = asyncHandler(async (req: UserRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) {
        res.status(400).json({ message: "User not found" });
        return
    }


    try {
        const result = await pool.query(
            `
            SELECT 
                person.id,
                person.first_name,
                person.last_name,
                person.email,
                posts.id AS post_id,
                posts.title,
                posts.content
            FROM person 
            JOIN posts ON person.id = posts.user_id
            WHERE person.id = $1
            `,
            [userId]
        );

        res.status(200).json({
            message: "User's posts successfully fetched",
            posts: result.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Something went wrong",
        });
    }
});

export const getMyPost = asyncHandler(async (req: UserRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const roleId = req.user?.role_id;
    if(!userId) {
        res.status(401).json({ message: "User not Authorized" });
        return;
    }


    try {
        const isOwner = String(userId) === String(userId);
        const isAdmin = Number(roleId) === 1;

        if (!isOwner && !isAdmin) {
            res.status(403).json({ message: "Forbidden: You are not authorized to get the details of this post" });
            return
        }

        // 1. Fetch all posts with their authors and the new image_url
        const MyPostsResult = await pool.query(
            `
                SELECT
                    p.id AS post_id,
                    p.title,
                    p.content,
                    p.image_url, -- <--- NEW: Include the image_url
                    p.created_at AS post_created_at, -- <--- Added: Post creation timestamp
                    p.updated_at AS post_updated_at, -- <--- Added: Post update timestamp

                    u.id AS author_id,
                    u.first_name AS author_first_name,
                    u.last_name AS author_last_name,
                    u.email AS author_email
                FROM posts p
                         JOIN person u ON p.user_id = u.id
                ORDER BY p.created_at DESC -- Order posts by creation date
            `
        );

        const posts = MyPostsResult.rows;

        // If no posts are found, return early
        if (posts.length === 0) {
            return res.status(200).json({
                message: "No posts available",
                posts: []
            });
        }

        // 2. Extract all post IDs to fetch comments efficiently
        const postIds = posts.map(post => post.post_id);

        // 3. Fetch all comments for these posts along with commenter details
        const TheCommentsResult = await pool.query(
            `
                SELECT
                    c.id AS comment_id,
                    c.post_id,
                    c.content AS comment_content,
                    c.created_at AS comment_created_at,
                    u.id AS commenter_id,
                    u.first_name AS commenter_first_name,
                    u.last_name AS commenter_last_name,
                    u.email AS commenter_email
                FROM comments c
                         JOIN person u ON c.user_id = u.id
                WHERE c.post_id = ANY($1::int[]) -- Fetch comments for all relevant post IDs
                ORDER BY c.created_at ASC 
            `,
            [postIds] // Pass the array of post IDs
        );

        const comments = TheCommentsResult.rows;

        // 4. Map comments to their respective posts and include image_url
        const PostsWithComments = posts.map(post => {
            // Find all comments for the current post
            const postComments = comments
                .filter(comment => comment.post_id === post.post_id)
                .map(comment => ({
                    id: comment.comment_id,
                    content: comment.comment_content,
                    created_at: comment.comment_created_at,
                    commenter: { // Nest commenter details
                        id: comment.commenter_id,
                        first_name: comment.commenter_first_name,
                        last_name: comment.commenter_last_name,
                        email: comment.commenter_email
                    }
                }));

            // Return the post object with an added 'comments' array
            return {
                id: post.post_id,
                title: post.title,
                content: post.content,
                image_url: post.image_url, // <--- NEW: Include the image_url here
                created_at: post.post_created_at, // Use the alias from the query
                updated_at: post.post_updated_at, // Use the alias from the query
                author: { // Nest author details for clarity
                    id: post.author_id,
                    first_name: post.author_first_name,
                    last_name: post.author_last_name,
                    email: post.author_email
                },
                comments: postComments // Add the array of comments
            };
        });

        res.status(200).json({
            message: "Posts with comments successfully fetched",
            posts: PostsWithComments
        });

    } catch (error) {
        console.error("Error fetching posts with comments:", error);
        res.status(500).json({
            message: "Something went wrong while fetching posts.",
            error: error instanceof Error ? error.message : "An unknown error occurred"
        });
    }


});

// Assuming your existing updatePost endpoint in Node.js
export const updatePost = asyncHandler(async (req: UserRequest, res: Response, next: NextFunction) => {
    const { title, content } = req.body;
    const { id: postId } = req.params;
    const userId = req.user?.id;
    const userRoleId = req.user?.role_id;

    if (!userId) {
        return res.status(401).json({ message: "Authentication required: User ID not found." });
    }

    if (!postId) {
        return res.status(400).json({ message: "Post ID is required." });
    }

    if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required for update." });
    }

    // Get post to check permissions
    const { data: post, error: fetchError } = await supabase
        .from("posts")
        .select("user_id")
        .eq("id", postId)
        .single();

    if (fetchError || !post) {
        return res.status(404).json({ message: "Post not found." });
    }

    const isOwner = String(post.user_id) === String(userId);
    const isAdmin = Number(userRoleId) === 1;

    if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: "Forbidden: You are not authorized to update this post." });
    }

    let image_url: string | null = req.body.image_url || null;

    // If new file uploaded, store it in Supabase
    if (req.file) {
        const fileExt = req.file.originalname.split(".").pop();
        const fileName = `${uuid()}.${fileExt}`;
        const filePath = `posts/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from("myfiles")
            .upload(filePath, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true,
            });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
            .from("myfiles")
            .getPublicUrl(filePath);

        image_url = publicUrlData.publicUrl;
    }

    // Update the post
    const { data: updatedPost, error: updateError } = await supabase
        .from("posts")
        .update({
            title,
            content,
            image_url,
            updated_at: new Date().toISOString(),
        })
        .eq("id", postId)
        .select()
        .single();

    if (updateError) {
        console.error("Error updating post:", updateError);
        return res.status(500).json({ message: "Failed to update post." });
    }

    res.status(200).json({
        message: "Post updated successfully",
        post: updatedPost,
    });
});



