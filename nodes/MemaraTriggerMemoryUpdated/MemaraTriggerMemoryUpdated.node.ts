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
import {
	buildListMemoriesQs,
	fingerprintListMemory,
	sortMemoriesByCreatedAtDesc,
} from '../shared/memaraPollHelpers';

const STATIC_KEY = 'memaraTriggerMemoryUpdated';

type UpdatedStatic = {
	initialized?: boolean;
	fpById?: Record<string, string>;
};

export class MemaraTriggerMemoryUpdated implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Memara Trigger: Memory Updated',
		name: 'memaraTriggerMemoryUpdated',
		icon: 'file:../shared/memara.svg',
		group: ['trigger'],
		version: 1,
		subtitle: 'Poll for content changes (windowed)',
		description:
			'Best-effort polling: detects content/tag/metadata changes for memories that appear in the current list window only. Memories outside the fetched page cannot be observed. Each poll uses the list memories API and counts toward your Memara request limits.',
		defaults: {
			name: 'Memara: Memory updated',
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
				description: 'Maximum memories fetched per poll (1–100)',
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
				description: 'Optional comma-separated tags for the list memories API',
			},
			{
				displayName: 'Source',
				name: 'source',
				type: 'string',
				default: '',
				description: 'Optional source filter for the list memories API',
			},
			{
				displayName: 'Minimum Importance',
				name: 'minImportance',
				type: 'number',
				default: 0,
				description: 'Optional minimum importance (1–10). Use 0 to disable',
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
		const state = (staticData[STATIC_KEY] as UpdatedStatic | undefined) ?? {};
		staticData[STATIC_KEY] = state as unknown as IDataObject;

		if (memories.length === 0) {
			if (!state.initialized) {
				state.initialized = true;
				state.fpById = {};
				staticData[STATIC_KEY] = state as unknown as IDataObject;
			}
			return null;
		}

		const nextFp: Record<string, string> = {};
		for (const m of memories) {
			const id = String(m.id ?? '');
			if (!id) continue;
			nextFp[id] = fingerprintListMemory(m);
		}

		if (!state.initialized) {
			state.initialized = true;
			state.fpById = nextFp;
			staticData[STATIC_KEY] = state as unknown as IDataObject;
			return null;
		}

		const prev = state.fpById ?? {};
		const out: INodeExecutionData[] = [];
		for (const m of memories) {
			const id = String(m.id ?? '');
			if (!id) continue;
			const fp = nextFp[id];
			const old = prev[id];
			if (old !== undefined && old !== fp) {
				out.push({ json: { ...m, _memaraTrigger: 'memory_updated' } });
			}
		}

		out.sort((a, b) =>
			String(a.json.id ?? '').localeCompare(String(b.json.id ?? '')),
		);

		state.fpById = nextFp;
		staticData[STATIC_KEY] = state as unknown as IDataObject;

		if (out.length === 0) {
			return null;
		}
		return [out];
	}
}
