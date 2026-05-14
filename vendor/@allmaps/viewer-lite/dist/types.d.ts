import { GeoreferencedMap } from '@allmaps/annotation';
import { ProjectionLike } from 'ol/proj';

export type ViewerLiteBasemapPresetId = 'osm' | 'esri-world-topo' | 'esri-world-street' | 'esri-world-imagery';
export type ViewerLiteBasemapOptions = {
    type: 'xyz';
    url: string;
    attribution?: string;
    maxZoom?: number;
    label?: string;
    value?: ViewerLiteBasemapPresetId;
};
export type ViewerLiteBasemapPreset = ViewerLiteBasemapOptions & {
    value: ViewerLiteBasemapPresetId;
    label: string;
};
export type ViewerLiteBasemapInput = false | ViewerLiteBasemapPresetId | ViewerLiteBasemapOptions;
export type ViewerLiteInteractionOptions = {
    pan?: boolean;
    zoom?: boolean;
};
export type ViewerLiteOutlineMode = 'mask' | 'bbox';
export type ViewerLiteOutlineFillMode = 'fill' | 'none';
export type ViewerLiteOutlineStyleOptions = {
    strokeColor?: string;
    strokeWidth?: number;
    fillColor?: string;
};
export type ViewerLitePreviewOptions = {
    mode?: ViewerLiteOutlineMode;
    strokeColor?: string;
    strokeWidth?: number;
    fillColor?: string;
};
export type ViewerLiteRenderControls = {
    opacity?: boolean;
    enhanceLines?: boolean;
};
export type ViewerLiteOptions = {
    outlineStyle?: ViewerLiteOutlineStyleOptions;
    maps?: GeoreferencedMap[];
    projection?: ProjectionLike;
    basemap?: ViewerLiteBasemapInput;
    interaction?: ViewerLiteInteractionOptions;
    controls?: ViewerLiteRenderControls;
    preview?: ViewerLitePreviewOptions;
    fitOnInit?: boolean;
};
export type ViewerLiteMapRecord = {
    id: string;
    map: GeoreferencedMap;
    visible: boolean;
};
export type ViewerLiteMapOrderDirection = 'forward' | 'backward';
export type ViewerLitePreviewGeometry = {
    geometry: unknown;
    featureId?: string;
    dataProjection?: ProjectionLike;
};
export type ViewerLiteViewportBounds = {
    west: number;
    south: number;
    east: number;
    north: number;
};
export type ViewerLiteViewportState = {
    bounds: ViewerLiteViewportBounds;
    center: {
        lon: number;
        lat: number;
    };
    zoom: number;
};
export type ViewerLiteEventMap = {
    ready: undefined;
    mapclick: {
        mapId: string;
    };
    maphover: {
        mapId: string | undefined;
    };
    viewportchange: ViewerLiteViewportState;
};
export type ViewerLiteEventName = keyof ViewerLiteEventMap;
