import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    // User who subscribes
    subscriber: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Channel (User) being subscribed to
    channel: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent the same user from subscribing to the same channel more than once
subscriptionSchema.index(
  { subscriber: 1, channel: 1 },
  { unique: true }
);

export const Subscription = mongoose.model(
  "Subscription",
  subscriptionSchema
);