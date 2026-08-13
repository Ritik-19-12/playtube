import { Router } from 'express';
import {
    getAllVideos,
    publishAVideo,
    getVideoById,
    addVideoView,
    updateVideo,
    deleteVideo
} from "../controllers/video.controller.js"
import {verifyJWT} from "../middleware/auth.middleware.js"
import {upload} from "../middleware/multer.middleware.js"

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router
    .route("/")
    .get(getAllVideos)
    .post(
        upload.fields([
            {
                name: "videoFile",
                maxCount: 1,
            },
            {
                name: "thumbnail",
                maxCount: 1,
            },
            
        ]),
        publishAVideo
    );

router.route("/:videoId").get(getVideoById);
router.route("/:videoId/view").post(addVideoView);
router
    .route("/:videoId")
    .get(getVideoById)
    .patch(
        upload.fields([
            {
                name: "thumbnail",
                maxCount: 1,
            },
        ]),
        updateVideo
    );

router.route("/:videoId").delete(verifyJWT,deleteVideo);


export default router