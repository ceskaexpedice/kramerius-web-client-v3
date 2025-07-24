import { createAction, props } from '@ngrx/store';
import {Metadata} from '../../../shared/models/metadata.model';
import {SoundTrackModel} from '../../models/sound-track.model';

export const loadMusic = createAction('[Music] Load', props<{ uuids: string[] }>());
export const loadMusicSuccess = createAction('[Music] Load Success', props<{ metadata: Metadata | null; tracks: SoundTrackModel[]; }>());
export const loadMusicFailure = createAction('[Music] Load Failure', props<{ error: any }>());
