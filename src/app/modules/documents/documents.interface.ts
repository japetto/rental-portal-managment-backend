import { Document, ObjectId } from "mongoose";

export type DocumentType = "IMAGE" | "PDF" | "DOC";

export interface IDocument extends Document {
  title: string;
  description?: string;
  fileUrl: string;
  fileType: DocumentType;
  fileName: string;
  fileSize?: number; // in bytes
  propertyId: ObjectId;
  uploadedBy: ObjectId; // admin ID
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  tags?: string[];
  category?: string; // e.g., "LEASE_AGREEMENT", "RULES", "MAINTENANCE", "GENERAL"
  expiryDate?: Date; // optional expiry date for time-sensitive documents
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateDocument {
  title: string;
  description?: string;
  fileUrl: string;
  fileType: DocumentType;
  fileName: string;
  fileSize?: number;
  propertyId: string;
  tags?: string[];
  category?: string;
  expiryDate?: Date;
}

export interface IUpdateDocument {
  title?: string;
  description?: string;
  fileUrl?: string;
  fileType?: DocumentType;
  fileName?: string;
  fileSize?: number;
  tags?: string[];
  category?: string;
  expiryDate?: Date;
  isActive?: boolean;
}

export interface IDocumentFilters {
  propertyId?: string;
  fileType?: DocumentType;
  category?: string;
  isActive?: boolean;
  search?: string; // search in title and description
  tags?: string[];
  uploadedBy?: string;
}

export interface IDocumentWithProperty
  extends Omit<IDocument, "propertyId" | "uploadedBy"> {
  propertyId: {
    _id: string;
    name: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
    };
  };
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
}

export interface IDocumentStats {
  totalDocuments: number;
  documentsByType: {
    IMAGE: number;
    PDF: number;
    DOC: number;
  };
  documentsByCategory: Record<string, number>;
  recentUploads: number; // documents uploaded in last 30 days
}
