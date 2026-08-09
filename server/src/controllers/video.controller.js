import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

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
  .json(
    new ApiResponse(200,video, "Video fetched Successfully")
  )
});

export { getAllVideos, publishAVideo , getVideoById };
