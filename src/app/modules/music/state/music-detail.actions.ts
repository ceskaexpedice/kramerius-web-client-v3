import { createAction, props } from '@ngrx/store';
import {Metadata} from '../../../shared/models/metadata.model';

export const loadMusic = createAction('[Music] Load', props<{ uuids: string[] }>());
export const loadMusicSuccess = createAction('[Music] Load Success', props<{ document: any; metadata: any; tracks: any[]; }>());
export const loadMusicFailure = createAction('[Music] Load Failure', props<{ error: any }>());
