import { createAction, props } from '@ngrx/store';
import {FacetItem} from '../../../models/facet-item';

export const loadDocumentTypes = createAction('[DocumentTypes] Load');
export const loadDocumentTypesSuccess = createAction('[DocumentTypes] Load Success', props<{ data: FacetItem[] }>());
export const loadDocumentTypesFailure = createAction('[DocumentTypes] Load Failure', props<{ error: any }>());
