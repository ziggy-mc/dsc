"use strict";

function extractSingleFile(fileField) {
  if (!fileField) return null;
  return Array.isArray(fileField) ? fileField[0] || null : fileField;
}

function isImageMimeType(mimeType) {
  return typeof mimeType === "string" && mimeType.toLowerCase().startsWith("image/");
}

function sanitizeUploadFilename(originalFilename) {
  return (originalFilename || "image")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 128);
}

module.exports = {
  extractSingleFile,
  isImageMimeType,
  sanitizeUploadFilename,
};
