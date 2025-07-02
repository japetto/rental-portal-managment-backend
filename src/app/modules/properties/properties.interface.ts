import { Document } from "mongoose";

export interface IProperty extends Document {
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  amenities: string[];
  images: string[];
  rules: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateProperty {
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  amenities: string[];
  images?: string[];
  rules?: string[];
}

export interface IUpdateProperty {
  name?: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  amenities?: string[];
  images?: string[];
  rules?: string[];
}
