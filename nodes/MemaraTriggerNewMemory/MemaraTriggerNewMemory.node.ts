import type {
	IDataObject,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { memaraRequest } from '../shared/memaraBase';
import { buildListMemoriesQs, sortMemoriesByCreatedAtDesc } from '../shared/memaraPollHelpers';

const STATIC_KEY = 'memaraTriggerNewMemory';

type NewMemoryStatic = {
	initialized?: boolean;
	lastMaxTime?: string;
	idsAtLastMax?: string[];
};

function maxCreatedAt(memories: IDataObject[]): string {
	let max = '';
	for (const m of memories) {
		const t = String(m.created_at ?? '');
		if (t > max) max = t;
	}
	return max;
}

function idsAtTime(memories: IDataObject[], time: string): string[] {
	const ids: string[] = [];
	for (const m of memories) {
		if (String(m.created_at ?? '') === time) {
			const id = String(m.id ?? '');
			if (id) ids.push(id);
		}
	}
	return ids;
}

export class MemaraTriggerNewMemory implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Memara Trigger: New Memory',
		name: 'memaraTriggerNewMemory',
		icon: 'file:../shared/memara.svg',
		group: ['trigger'],
		version: 1,
		subtitle: 'Poll for new memories',
		description:
			'Starts the workflow when new memories appear in your Memara space (polling). Only memories visible in the configured list window are considered; each poll counts as an API request toward your Memara limits.',
		defaults: {
			name: 'Memara: New memory',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		polling: true,
		credentials: [
			{
				name: 'memaraApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				description: 'Max number of results to return',
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: 'Optional comma-separated tags; only memories matching all listed tags are returned by the API',
			},
			{
				displayName: 'Source',
				name: 'source',
				type: 'string',
				default: '',
				description: 'Optional source filter passed to the list memories API',
			},
			{
				displayName: 'Minimum Importance',
				name: 'minImportance',
				type: 'number',
				default: 0,
				description: 'Optional minimum importance (1–10). Use 0 to disable this filter.',
				typeOptions: {
					minValue: 0,
					maxValue: 10,
				},
			},
		],
	};

	// eslint-disable-next-line no-unused-vars
	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const limit = Math.min(
			Math.max(Number(this.getNodeParameter('limit', 50)) || 50, 1),
			100,
		);
		const tagsCsv = String(this.getNodeParameter('tags', '') ?? '');
		const source = String(this.getNodeParameter('source', '') ?? '');
		const minRaw = Number(this.getNodeParameter('minImportance', 0));
		const minImportance = minRaw >= 1 && minRaw <= 10 ? minRaw : undefined;

		const qs = buildListMemoriesQs({
			limit,
			offset: 0,
			tagsCsv,
			source: source.trim() || undefined,
			minImportance,
		});

		const requestOpts: IHttpRequestOptions = {
			method: 'GET',
			url: '/api/v1/n8n/memories',
			qs: qs as IDataObject,
			json: true,
		};
		if (Array.isArray(qs.tags) && (qs.tags as unknown[]).length > 0) {
			requestOpts.arrayFormat = 'repeat';
		}

		const response = (await memaraRequest(this, requestOpts)) as {
			memories?: IDataObject[];
		};
		const raw = response.memories ?? [];
		const memories = sortMemoriesByCreatedAtDesc(raw);

		const staticData = this.getWorkflowStaticData('node') as IDataObject;
		const state = (staticData[STATIC_KEY] as NewMemoryStatic | undefined) ?? {};
		staticData[STATIC_KEY] = state as unknown as IDataObject;

		if (memories.length === 0) {
			if (!state.initialized) {
				state.initialized = true;
				state.lastMaxTime = '';
				state.idsAtLastMax = [];
				staticData[STATIC_KEY] = state as unknown as IDataObject;
			}
			return null;
		}

		const newMaxTime = maxCreatedAt(memories);
		const idsForMax = newMaxTime ? idsAtTime(memories, newMaxTime) : [];

		if (!state.initialized) {
			state.initialized = true;
			state.lastMaxTime = newMaxTime;
			state.idsAtLastMax = idsForMax;
			staticData[STATIC_KEY] = state as unknown as IDataObject;
			return null;
		}

		const lastMax = state.lastMaxTime ?? '';
		const prevIds = new Set(state.idsAtLastMax ?? []);
		const out: INodeExecutionData[] = [];

		for (const m of memories) {
			const t = String(m.created_at ?? '');
			const id = String(m.id ?? '');
			const isNewer = t > lastMax;
			const isSameSecondNew = t === lastMax && id && !prevIds.has(id);
			if (isNewer || isSameSecondNew) {
				out.push({ json: { ...m, _memaraTrigger: 'new_memory' } });
			}
		}

		out.sort((a, b) => {
			const ta = String(a.json.created_at ?? '');
			const tb = String(b.json.created_at ?? '');
			if (ta < tb) return -1;
			if (ta > tb) return 1;
			return String(a.json.id ?? '').localeCompare(String(b.json.id ?? ''));
		});

		state.lastMaxTime = newMaxTime;
		state.idsAtLastMax = idsForMax;
		staticData[STATIC_KEY] = state as unknown as IDataObject;

		if (out.length === 0) {
			return null;
		}
		return [out];
	}
}
