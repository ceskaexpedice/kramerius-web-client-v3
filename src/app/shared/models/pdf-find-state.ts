/**
 * Mirror of ngx-extended-pdf-viewer's `FindState` enum (same numeric values).
 *
 * Importing the enum from the library is a static import of the whole package
 * (~0.9 MB), which would pull the PDF viewer into every chunk that only needs
 * these four constants (PdfService, document/pdf sidebars). The library emits
 * these values in `(updateFindState)`.
 */
export const FindState = {
  FOUND: 0,
  NOT_FOUND: 1,
  WRAPPED: 2,
  PENDING: 3,
} as const;

export type FindState = (typeof FindState)[keyof typeof FindState];
