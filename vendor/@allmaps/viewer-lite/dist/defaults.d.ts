import { ViewerLiteBasemapInput, ViewerLiteBasemapOptions, ViewerLiteBasemapPreset, ViewerLiteBasemapPresetId, ViewerLiteOptions } from './types.js';

export declare const VIEWER_LITE_BASEMAP_PRESETS: ViewerLiteBasemapPreset[];
export declare const DEFAULT_BASEMAP: ViewerLiteBasemapPreset;
export declare const DEFAULT_INTERACTION: {
    pan: boolean;
    zoom: boolean;
};
export declare const DEFAULT_PREVIEW: {
    mode: "mask";
    strokeColor: string;
    strokeWidth: number;
    fillColor: string;
};
export declare const DEFAULT_FIT_ON_INIT = true;
export declare function resolveBasemap(basemap: ViewerLiteBasemapInput | undefined): ViewerLiteBasemapOptions | false;
export declare function getBasemapPreset(value: ViewerLiteBasemapPresetId): ViewerLiteBasemapPreset;
export declare function mergeViewerOptions(options: ViewerLiteOptions): Required<Pick<ViewerLiteOptions, 'fitOnInit'>> & {
    basemap: ViewerLiteBasemapOptions | false;
    interaction: Required<NonNullable<ViewerLiteOptions['interaction']>>;
    preview: Required<NonNullable<ViewerLiteOptions['preview']>>;
    outlineStyle: Required<NonNullable<ViewerLiteOptions['outlineStyle']>>;
};
