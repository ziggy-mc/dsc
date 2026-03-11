import mongoose from "mongoose";

const supporterSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    addedAt: Date,
    roleId: String,
    roleName: String,
    username: String,
  },
  {
    collection: "supporters",
    timestamps: false,
  }
);

export default mongoose.models.Supporter ||
  mongoose.model("Supporter", supporterSchema);
