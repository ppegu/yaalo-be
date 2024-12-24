import mongoose, { Schema, Document } from "mongoose";
import { object, string, boolean } from "yup";

interface IUser extends Document {
  name: string;
  email?: string;
  deviceName: string;
  deviceOS: "android" | "ios";
  deviceId: string;
  mobileNumber?: string;
  isEmulator: boolean;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String },
    email: { type: String, unique: true, sparse: true },
    mobileNumber: { type: String },
    deviceName: { type: String, required: true },
    deviceOS: { type: String, required: true },
    deviceId: { type: String, required: true },
    isEmulator: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = mongoose.model<IUser>("User", UserSchema);

export default User;

export const userValidationSchema = object({
  name: string().nullable(),
  email: string().email().nullable(),
  mobileNumber: string().nullable(),
  deviceName: string().required(),
  deviceOS: string().required(),
  deviceId: string().required(),
  isEmulator: boolean().required(),
});
