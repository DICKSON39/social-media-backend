import express from 'express';
import {protect} from "../middleware/auth/protect.auth";
import {AdminOrUser} from "../middleware/rolesMiddleware/role.middleware";
import {
    deleteComment,
    getAllCommentForAPost,
    makeACommentOnAPost, updateComment,
    WhoPostedOnMyPost
} from "../controller/comment.controller";
import {deletePost} from "../controller/posts.controller";

const router = express.Router();

router.post('/post/:postId',protect,makeACommentOnAPost);
router.get('/post/:postId',protect,getAllCommentForAPost);
router.get('/my-post/comments/:postId',protect,WhoPostedOnMyPost)
router.delete('/delete/:id',protect,AdminOrUser,deleteComment)
router.put('/comments/:id',protect,updateComment);

export default router;