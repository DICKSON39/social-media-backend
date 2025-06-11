import express from 'express';
import {
    createPost,
    deletePost,
    getAllPostByUser,
    getAllPosts,
    getMyPost,
    updatePost,

} from "../controller/posts.controller";
import {protect} from "../middleware/auth/protect.auth";
import {AdminOrUser} from "../middleware/rolesMiddleware/role.middleware";
import {upload} from "../middleware/upload/upload";

const router = express.Router();

router.post('/post',protect,AdminOrUser,upload.single("image"),createPost)
router.delete("/posts/:postId", protect, deletePost);
router.get('/posts',getAllPosts);
router.get('/posts-by-user',protect,getAllPostByUser)
router.get('/my-posts',protect,getMyPost)
router.put('/posts/:id',protect,upload.single("image"),updatePost)


export default router;
