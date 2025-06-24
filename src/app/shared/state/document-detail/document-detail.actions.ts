import { createAction, props } from '@ngrx/store';
import {DocumentDetail} from '../../../modules/models/document-detail';

export const loadDocumentDetail = createAction(
  '[DocumentDetail] Load'
);
export const loadDocumentDetailSuccess = createAction('[DocumentDetail] Load Success', props<{ data: DocumentDetail, pages: any[] }>());
export const loadDocumentDetailFailure = createAction('[DocumentDetail] Load Failure', props<{ error: any }>());
