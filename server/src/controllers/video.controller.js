import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination

  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  const matchStage = {};

  if (query) {
    matchStage.$or = [
      { description: { $regex: query, $options: "i" } },
      { videoFile: { $regex: query, $options: "i" } },
      { title: { $regex: query, $options: "i" } },
    ];
  }

  if (userId) {
    // matchStage.owner = new mongoose.Types.ObjectId(req.user?.id);  we have to use user id here which is provided by query
    matchStage.owner = new mongoose.Types.ObjectId(userId);
  }

  const sortStage = {};

  if (sortBy && sortType) {
    sortStage[sortBy] = sortType === "asc" ? 1 : -1;
  } else {
    sortStage.createdAt = -1; // Default sorting by createdAt in descending order
  }

  const aggregate = Video.aggregate([
    {
      $match: matchStage,
    },
    {
      $sort: sortStage,
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },
  ]);

  const result = await Video.aggregatePaginate(aggregate, {
    page: pageNumber,
    limit: limitNumber,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video

  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (
    !title?.trim() ||
    !description?.trim() ||
    !videoFileLocalPath ||
    !thumbnailLocalPath
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile || !thumbnail) {
    throw new ApiError(400, "Error while uploading video or thumbnail");
  }

  const video = await Video.create({
    title,
    description,
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    duration: videoFile.duration,
    owner: req.user._id,
  });

  if (!video) {
    throw new ApiError(500, "Something went wrong while publishing video");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, video, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid!! Video id");
  }

  const video = await Video.findById(videoId).populate(
    "owner",
    "username fullname avatar"
  );

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched Successfully"));
});

const addVideoView = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid!! Video id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $inc: {
        views: 1,
      },
    },
    {
      returnDocument: "after",
    }
  );

  if (!updatedVideo) {
    throw new ApiError(500, "Something went wrong while updating video views");
  }

  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: {
      watchHistory: videoId,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video view added successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid!! Video id");
  }
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (!video.owner.equals(req.user._id)) {
    throw new ApiError(403, "You are not authorized to update this video");
  }

  const { title, description } = req.body || {};
  const thumbnailLocalpath = req.files?.thumbnail?.[0]?.path;

  const updateData = {};

  if (title?.trim()) {
    updateData.title = title.trim();
  }

  if (description?.trim()) {
    updateData.description = description.trim();
  }

  if (thumbnailLocalpath) {
    console.log("Thumbnail path:", thumbnailLocalpath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalpath);
    if (!thumbnail || !thumbnail.url) {
      throw new ApiError(500, "Error While Uploading thumbnail");
    }
    updateData.thumbnail = thumbnail.url;
  }

  if (Object.keys(updateData).length === 0) {
    throw new ApiError(400, "No fields provided for update");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: updateData,
    },
    {
      returnDocument: "after",
    }
  ).select("-views");

  if (!updatedVideo) {
    throw new ApiError(500, "Something went wrong while updating video");
  }

  const fieldNames = {
    title: "Title",
    description: "Description",
    thumbnail: "Thumbnail",
  };

  const updatedFields = Object.keys(updateData).map(
    (field) => fieldNames[field]
  );

  const message = `${updatedFields.join(", ")} updated successfully`;

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedVideo,
        `${updatedFields.join(", ")} updated successfully`
      )
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  // Check if videoId is a valid MongoDB ObjectId
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  // Find the video
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Only the owner can delete the video
  if (!video.owner.equals(req.user._id)) {
    throw new ApiError(403, "You are not authorized to delete this video");
  }

  // Get Cloudinary URLs
  const videoFilePath = video.videoFile;
  const thumbnailFilePath = video.thumbnail;

  // Extract Cloudinary public IDs from URLs
  const videoPublicId = videoFilePath.split("/").pop().split(".")[0];
  const thumbnailPublicId = thumbnailFilePath.split("/").pop().split(".")[0];

  // Delete video from Cloudinary
  const deletedVideoFile = await cloudinary.uploader.destroy(videoPublicId, {
    resource_type: "video",
  });

  if (deletedVideoFile.result !== "ok") {
    throw new ApiError(500, "Error while deleting video from Cloudinary");
  }

  // Delete thumbnail from Cloudinary
  const deletedThumbnail = await cloudinary.uploader.destroy(
    thumbnailPublicId,
    {
      resource_type: "image",
    }
  );

  if (deletedThumbnail.result !== "ok") {
    throw new ApiError(500, "Error while deleting thumbnail from Cloudinary");
  }

  // Delete video document from MongoDB
  const deletedVideo = await Video.findByIdAndDelete(videoId);

  if (!deletedVideo) {
    throw new ApiError(500, "Something went wrong while deleting video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  addVideoView,
  updateVideo,
  deleteVideo,
};
