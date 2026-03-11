import mongoose from "mongoose";

const dsReportSchema = new mongoose.Schema({
  reporterDiscordId: {
    type: String,
    required: true,
  },

  reporterUsername: {
    type: String,
    required: true,
  },

  reportedLink: {
    type: String,
    required: true,
  },

  shortCode: {
    type: String,
    required: true,
  },

  reason: {
    type: String,
    required: true,
  },

  imageUrl: {
    type: String,
    default: null,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.DSReport ||
  mongoose.model("DSReport", dsReportSchema);
