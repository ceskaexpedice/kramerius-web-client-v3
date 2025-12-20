import { createAction, props } from '@ngrx/store';
import {Metadata} from '../../models/metadata.model';

export const loadDocumentDetail = createAction(
  '[DocumentDetail] Load',
  props<{ uuid?: string }>()
);
export const loadDocumentDetailSuccess = createAction('[DocumentDetail] Load Success', props<{ data: Metadata, pages: any[] }>());
export const loadDocumentDetailFailure = createAction('[DocumentDetail] Load Failure', props<{ error: any }>());

export const loadArticleDetail = createAction(
  '[DocumentDetail] Load Article Detail',
  props<{ articleUuid: string }>()
);
export const loadArticleDetailSuccess = createAction(
  '[DocumentDetail] Load Article Detail Success',
  props<{ articleDetail: any }>()
);
export const loadArticleDetailFailure = createAction(
  '[DocumentDetail] Load Article Detail Failure',
  props<{ error: any }>()
);
