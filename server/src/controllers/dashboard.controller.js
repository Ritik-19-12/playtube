import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
  const totalVideos = await Video.countDocuments({
    owner: req.user._id,
  });
  const totalSubscribers = await Subscription.countDocuments({
    channel: req.user._id,
  });
  const videos = await Video.find({
    owner: req.user._id,
  });

  const videoIds = videos.map((video) => video._id);

  const totalLikes = await Like.countDocuments({
    video: {
      $in: videoIds,
    },
  });

  const totalViews = videos.reduce((total, video) => total + video.views, 0);

  const stats = {
    totalVideos,
    totalSubscribers,
    totalLikes,
    totalViews,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, stats, "Channel stats fetched successfully"));
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
  const videos = await Video.find({
    owner: req.user._id,
    isPublished: true,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "all Videoes are fetched"));
});

export { getChannelStats, getChannelVideos };
