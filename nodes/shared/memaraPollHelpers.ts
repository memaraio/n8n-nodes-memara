import type { IDataObject } from 'n8n-workflow';

import { parseTagsCsv } from './memaraBase';

/** Sort newest first for watermark / polling windows. */
export function sortMemoriesByCreatedAtDesc(memories: IDataObject[]): IDataObject[] {
	return [...memories].sort((a, b) => {
		const ta = String(a.created_at ?? '');
		const tb = String(b.created_at ?? '');
		if (ta < tb) return 1;
		if (ta > tb) return -1;
		const ida = String(a.id ?? '');
		const idb = String(b.id ?? '');
		return ida < idb ? 1 : ida > idb ? -1 : 0;
	});
}

export function fingerprintListMemory(m: IDataObject): string {
	return JSON.stringify({
		content: m.content ?? '',
		tags: m.tags ?? [],
		importance: m.importance ?? null,
		category: m.category ?? '',
		metadata: m.metadata ?? {},
	});
}

export function buildListMemoriesQs(params: {
	limit: number;
	offset: number;
	tagsCsv?: string;
	source?: string;
	minImportance?: number;
}): IDataObject {
	const qs: IDataObject = {
		limit: params.limit,
		offset: params.offset,
	};
	const tags = parseTagsCsv(params.tagsCsv ?? '');
	if (tags.length) {
		qs.tags = tags;
	}
	if (params.source && String(params.source).trim()) {
		qs.source = String(params.source).trim();
	}
	if (
		params.minImportance !== undefined &&
		params.minImportance !== null &&
		!Number.isNaN(Number(params.minImportance))
	) {
		qs.min_importance = Number(params.minImportance);
	}
	return qs;
}
