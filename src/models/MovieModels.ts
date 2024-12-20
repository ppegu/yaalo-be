import { model, Schema, Types } from "mongoose";
import { IDownloadLink, IEpisode, IMovie, ISession } from "../@types/movie";

const downloadLinkSchema = new Schema<IDownloadLink>({
  quality: { type: String, required: true },
  links: { type: [String], required: true },
  size: { type: String, required: true },
  unit: { type: String, required: true },
  sentence: { type: String, required: true },
});

const MovieBasicDetailsSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  releaseDate: { type: Date },
  duration: { type: Number, default: 0 },
  poster: { type: String, required: true },
  downloadLinks: [{ type: Schema.Types.ObjectId, ref: "DownloadLink" }],
});

const MovieSchema = new Schema<IMovie>({
  ...MovieBasicDetailsSchema.obj,
  genres: { type: [String] },
  screenshots: { type: [String] },
  languages: { type: [String] },
  isSeries: { type: Boolean, default: false },
  sessions: [{ type: Types.ObjectId, ref: "Session" }],
});

const SessionSchema = new Schema<ISession>({
  movieId: { type: Schema.Types.ObjectId, ref: "Movie", required: true },
  sessionNumber: { type: Number, required: true },
  episodes: [{ type: Types.ObjectId, ref: "Episode" }],
});

const EpisodeSchema = new Schema<IEpisode>({
  ...MovieBasicDetailsSchema.obj,
  movieId: { type: Schema.Types.ObjectId, ref: "Movie", required: true },
  sessionId: { type: Schema.Types.ObjectId, ref: "Session", required: true },
});

const Movie = model<IMovie>("Movie", MovieSchema);
const Session = model<ISession>("Session", SessionSchema);
const Episode = model<IEpisode>("Episode", EpisodeSchema);
const DownloadLink = model<IDownloadLink>("DownloadLink", downloadLinkSchema);

export { DownloadLink, Episode, Movie, Session };
