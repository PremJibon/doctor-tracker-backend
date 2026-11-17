import { Schema, model, Document, Model } from "mongoose";

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  role: "admin";
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {}

const userSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
      // Excluded from default queries to avoid accidental exposure
      select: false,
    },
    role: {
      type: String,
      enum: ["admin"],
      default: "admin",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

// Index: unique email index for login lookups and preventing duplicate accounts
userSchema.index({ email: 1 }, { unique: true });

export const User: Model<IUserDocument> = model<IUserDocument>("User", userSchema);
