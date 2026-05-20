// app/types/document.ts

export enum DocumentType {
  CONTRACT = "CONTRACT",
  CERTIFICATE = "CERTIFICATE",
  ID_PROOF = "ID_PROOF",
  TAX_DOCUMENT = "TAX_DOCUMENT",
  MEDICAL = "MEDICAL",
  OFFER_LETTER = "OFFER_LETTER",
  RESIGNATION_LETTER = "RESIGNATION_LETTER",
  EXPERIENCE_LETTER = "EXPERIENCE_LETTER",
  NDA = "NDA",
  OTHER = "OTHER",
}

export enum DocumentStatus {
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  ARCHIVED = "ARCHIVED",
  DELETED = "DELETED",
}

export interface DocumentDtoRequest {
  employeeId: number;
  title: string;
  documentType: DocumentType;
  description?: string;
  expiryDate?: string; // ISO date string
}

export interface DocumentDtoResponse {
  id: number;
  employeeId: number;
  employeeName: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileSizeFormatted: string;
  documentType: DocumentType;
  status: DocumentStatus;
  description?: string;
  expiryDate?: string;
  isExpired: boolean;
  uploadedByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentDtoUpdateRequest {
  title?: string;
  documentType?: DocumentType;
  description?: string;
  expiryDate?: string;
  status?: DocumentStatus;
}
