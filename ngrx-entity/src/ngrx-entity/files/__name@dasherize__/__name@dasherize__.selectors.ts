import { createFeatureSelector, createSelector } from '@ngrx/store';
import { <%= classify(name) %>State } from './<%= dasherize(name) %>.reducer';

export const select<%= classify(name) %>State = createFeatureSelector<<%= classify(name) %>State>('<%= dasherize(name) %>');

export const select<%= classify(name) %> = createSelector(select<%= classify(name) %>State, state => state.data);
export const select<%= classify(name) %>Loading = createSelector(select<%= classify(name) %>State, state => state.loading);
export const select<%= classify(name) %>Error = createSelector(select<%= classify(name) %>State, state => state.error);
