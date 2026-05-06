import { RecordItem } from '../components/record-item/record-item.model';
import { DocumentTypeEnum } from '../../modules/constants/document-type';

export interface Cutting {
  title: string;
  description: string;
  url: string;
  thumb: string;
  uuid?: string;
  bb?: string;
}

export function parseCutting(raw: any, getIiifBaseUrl: (uuid: string) => string): Cutting {
  const rawUrl: string = raw?.url ?? '';

  const item: Cutting = {
    title: raw?.name ?? '',
    description: raw?.description ?? '',
    url: rawUrl,
    thumb: '',
  };

  const uuidMatch = rawUrl.match(/uuid\/(uuid:[A-Fa-f0-9-]+)/);
  const bbMatch = rawUrl.match(/[?&]bb=([\d,]+)/);

  if (uuidMatch) {
    item.uuid = uuidMatch[1];
    item.url = `/uuid/${item.uuid}` + (bbMatch ? `?bb=${bbMatch[1]}` : '');
  }

  if (bbMatch && item.uuid) {
    item.bb = bbMatch[1];
    item.thumb = `${getIiifBaseUrl(item.uuid)}/${item.bb}/!400,400/0/default.jpg`;
  }

  return item;
}

export function cuttingToRecordItem(cutting: Cutting): RecordItem {
  const id = cutting.uuid ?? '';
  return {
    id,
    title: cutting.title,
    description: cutting.description,
    model: DocumentTypeEnum.collection,
    imageUrl: cutting.thumb,
    externalUrl: cutting.url,
    showFavoriteButton: false,
    showAccessibilityBadge: false,
    className: 'record-item--cutting',
  };
}
