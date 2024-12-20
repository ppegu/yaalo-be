import { Document, Types } from "mongoose";

export interface IWatching {
  isWatching?: boolean;
  lastwatchedAt?: Date;
}

export interface IDownloadLink extends Document {
  quality: string;
  links: string[];
  size: string;
  unit: string;
  sentence: string;
}

export interface IMovieBasicDetails {
  title: string;
  description?: string;
  releaseDate: Date;
  duration?: number;
  poster: string;
  downloadLinks: Types.ObjectId[];
}

export interface IMovie extends IWatching, IMovieBasicDetails, Document {
  genres: string[];
  screenshots: string[];
  isFavorite?: boolean;
  languages: string[];
  isSeries?: boolean;
  sessions?: Types.ObjectId[]; // Reference to Session documents
}

export interface ISession extends Document {
  movieId: Types.ObjectId; // Reference to Movie document
  sessionNumber: number;
  episodes?: Types.ObjectId[]; // Reference to Episode documents
}

export interface IEpisode extends IWatching, IMovieBasicDetails, Document {
  movieId: Types.ObjectId; // Reference to Movie document
  sessionId: Types.ObjectId; // Reference to Session document
}
