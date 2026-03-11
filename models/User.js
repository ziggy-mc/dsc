import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    discordId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    discordUsername: {
      type: String,
      required: true,
    },

    // BeatLeader connection
    beatleader: {
      userId: String,
      username: String,
      authenticated: {
        type: Boolean,
        default: false,
      },
      connectedAt: Date,
      tokens: {
        accessToken: String,
        refreshToken: String,
        expiresAt: Date,
      },
    },

    // Minecraft (Java) connection
    minecraft: {
      username: String,
      uuid: String,
      verified: {
        type: Boolean,
        default: false,
      },
      verificationCode: String,
      connectedAt: Date,
      verifiedAt: Date,
    },

    // Primary guild for bot dashboard
    primaryGuildId: {
      type: String,
      default: null,
    },

    // Shortener settings
    shortener: {
      enabled: {
        type: Boolean,
        default: true,
      },
      totalLinksCreated: {
        type: Number,
        default: 0,
      },
    },

    // Extra link-slot grants from referral codes
    referralPerks: {
      extraPermLinks: {
        type: Number,
        default: 0,
      },
      extraTempLinks: {
        type: Number,
        default: 0,
      },
    },

    suspended: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.User ||
  mongoose.model("User", userSchema);
