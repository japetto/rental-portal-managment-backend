import { Document, Types } from "mongoose";

export type AnnouncementType =
  | "GENERAL"
  | "MAINTENANCE"
  | "EVENT"
  | "EMERGENCY"
  | "RULE_UPDATE"
  | "BILLING"
  | "SECURITY"
  | "OTHER";

export type AnnouncementPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type AnnouncementTargetAudience =
  | "ALL"
  | "TENANTS_ONLY"
  | "ADMINS_ONLY"
  | "PROPERTY_SPECIFIC";

export interface IAnnouncement extends Document {
  title: string;
  content: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  propertyId?: Types.ObjectId; // If null, it's a system-wide announcement
  isActive: boolean;
  expiryDate?: Date; // Optional expiry date
  createdBy: string; // Admin who created the announcement
  attachments: string[]; // URLs to attached files/images
  readBy: Types.ObjectId[]; // Array of user IDs who have read this announcement
  targetAudience: AnnouncementTargetAudience;
  sendNotification: boolean;
  isSendNotification?: boolean; // Optional field to control notification sending
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  // Virtual fields
  isExpired: boolean;
  isCurrentlyActive: boolean;
  readCount: number;
}

export interface ICreateAnnouncement {
  title: string;
  content: string;
  type: AnnouncementType;
  priority?: AnnouncementPriority;
  propertyId?: string; // Optional - if not provided, it's system-wide
  expiryDate?: Date;
  attachments?: string[];
  targetAudience?: AnnouncementTargetAudience;
  sendNotification?: boolean;
  isSendNotification?: boolean; // Optional field to control notification sending
  tags?: string[];
}

export interface IUpdateAnnouncement {
  title?: string;
  content?: string;
  type?: AnnouncementType;
  priority?: AnnouncementPriority;
  propertyId?: string;
  isActive?: boolean;
  expiryDate?: Date;
  attachments?: string[];
  targetAudience?: AnnouncementTargetAudience;
  sendNotification?: boolean;
  isSendNotification?: boolean; // Optional field to control notification sending
  tags?: string[];
}

export interface IMarkAsRead {
  userId: string;
  announcementId: string;
}
