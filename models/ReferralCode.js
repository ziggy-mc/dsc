import mongoose from "mongoose";

const referralCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    /** What perk this code grants */
    perkType: {
      type: String,
      required: true,
      enum: ["permLinks", "tempLinks", "noLoading"],
    },
    /** For permLinks / tempLinks: how many extra slots are granted */
    perkValue: {
      type: Number,
      default: 1,
    },
    /** null = unlimited uses */
    maxUses: {
      type: Number,
      default: null,
    },
    /** How many times this code has been redeemed */
    uses: {
      type: Number,
      default: 0,
    },
    /** Discord IDs of users who have already redeemed this code */
    usedBy: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export default mongoose.models.ReferralCode ||
  mongoose.model("ReferralCode", referralCodeSchema);
