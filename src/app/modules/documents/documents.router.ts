import express from "express";
import { adminAuth } from "../../../middlewares/adminAuth";
import { userAuth } from "../../../middlewares/userAuth";
import zodValidationRequest from "../../../middlewares/zodValidationRequest";
import { DocumentsController } from "./documents.controller";
import { DocumentsValidation } from "./documents.validation";

const router = express.Router();

// Admin routes (require admin authentication)
router.post(
  "/",
  adminAuth,
  zodValidationRequest(DocumentsValidation.createDocumentZodSchema),
  DocumentsController.createDocument,
);

router.get(
  "/",
  adminAuth,
  zodValidationRequest(DocumentsValidation.getDocumentsZodSchema),
  DocumentsController.getAllDocuments,
);

router.get(
  "/stats",
  adminAuth,
  zodValidationRequest(DocumentsValidation.getDocumentStatsZodSchema),
  DocumentsController.getDocumentStats,
);

router.get("/categories", adminAuth, DocumentsController.getDocumentCategories);

router.get("/tags", adminAuth, DocumentsController.getDocumentTags);

router.get(
  "/:id",
  adminAuth,
  zodValidationRequest(DocumentsValidation.getDocumentByIdZodSchema),
  DocumentsController.getDocumentById,
);

router.patch(
  "/:id",
  adminAuth,
  zodValidationRequest(DocumentsValidation.updateDocumentZodSchema),
  DocumentsController.updateDocument,
);

router.delete(
  "/:id",
  adminAuth,
  zodValidationRequest(DocumentsValidation.deleteDocumentZodSchema),
  DocumentsController.deleteDocument,
);

// Tenant-specific route to get documents for their property
router.get("/tenant", userAuth, DocumentsController.getTenantDocuments);

export const DocumentsRoutes = router;
