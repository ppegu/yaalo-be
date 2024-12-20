import { model, Schema, Types } from "mongoose";
import {
  IDownloadLink,
  IEpisode,
  IMovie,
  ISession,
  IStreamableLink,
} from "../@types/movie";

const downloadLinkSchema = new Schema<IDownloadLink>({
  movieId: { type: Schema.Types.ObjectId, ref: "Movie", required: true },
  episodeId: { type: Schema.Types.ObjectId, ref: "Episode" },
  quality: { type: String, required: true },
  links: { type: [String], required: true },
  size: { type: String, required: true },
  unit: { type: String, required: true },
  sentence: { type: String, required: true },
});

const streamableLinksSchema = new Schema({
  movieId: { type: Schema.Types.ObjectId, ref: "Movie", required: true },
  downloadLinkId: { type: Schema.Types.ObjectId, required: true },
  link: { type: String, required: true },
  lastStreamedAt: { type: Date, required: true },
  fileSize: { type: Number, required: true },
});

const MovieBasicDetailsSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  releaseDate: { type: Date },
  duration: { type: Number, default: 0 },
  poster: { type: String, required: true },
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
const StreamableLink = model<IStreamableLink>(
  "StreamableLink",
  streamableLinksSchema
);

export { DownloadLink, Episode, Movie, Session, StreamableLink };
