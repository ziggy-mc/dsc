import mongoose from "mongoose";

const shortLinkSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    targetUrl: {
      type: String,
      required: true,
    },
    /** null for guest links */
    ownerDiscordId: {
      type: String,
      default: null,
      index: true,
    },
    domain: {
      type: String,
      required: true,
    },
    /** null if isPermanent is true */
    expiresAt: {
      type: Date,
      default: null,
    },
    isPermanent: {
      type: Boolean,
      default: false,
    },
    /** true for guest/free users (shows redirecting screen); false for supporters (instant redirect) */
    loading: {
      type: Boolean,
      default: true,
    },
    /** number of times this link has been opened */
    count: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export default mongoose.models.ShortLink ||
  mongoose.model("ShortLink", shortLinkSchema);
