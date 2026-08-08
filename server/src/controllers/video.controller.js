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

export { getAllVideos };
