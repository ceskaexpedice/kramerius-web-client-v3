import { createAction, props } from '@ngrx/store';
import { SearchDocument } from '../../../modules/models/search-document';

export const loadCollections = createAction('[Collections] Load');
export const loadCollectionsSuccess = createAction('[Collections] Load Success', props<{ data: SearchDocument[] }>());
export const loadCollectionsFailure = createAction('[Collections] Load Failure', props<{ error: any }>());