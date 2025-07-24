import { createAction, props } from '@ngrx/store';
import {Metadata} from '../../models/metadata.model';

export const loadDocumentDetail = createAction(
  '[DocumentDetail] Load',
  props<{ uuid?: string }>()
);
export const loadDocumentDetailSuccess = createAction('[DocumentDetail] Load Success', props<{ data: Metadata, pages: any[] }>());
export const loadDocumentDetailFailure = createAction('[DocumentDetail] Load Failure', props<{ error: any }>());
