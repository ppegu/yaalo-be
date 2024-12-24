import { model, Schema, Types } from "mongoose";
import { IMovie } from "../@types/movie";

export type IContinueWatching = Document & {
  userId: Types.ObjectId;
  movie: IMovie;
  series?: Types.ObjectId;
  episodId?: Types.ObjectId;
};

const schema = new Schema<IContinueWatching>({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  movie: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  series: {
    type: Types.ObjectId,
    required: false,
  },
  episodId: {
    type: Types.ObjectId,
    required: false,
  },
});

export default model<IContinueWatching>("ContinueWatching", schema);
