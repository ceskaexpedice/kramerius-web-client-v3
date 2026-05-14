import { Style } from 'ol/style.js';

export declare function invisiblePolygonStyle(): Style;
export declare function outlinePolygonStyle(options?: {
    strokeColor?: string;
    strokeWidth?: number;
    fillColor?: string;
}): Style;
export declare function previewPolygonStyle(options: {
    strokeColor: string;
    strokeWidth: number;
    fillColor: string;
}): Style;
