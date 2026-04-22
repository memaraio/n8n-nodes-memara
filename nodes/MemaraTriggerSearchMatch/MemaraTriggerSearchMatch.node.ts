import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { memaraRequest } from '../shared/memaraBase';

const STATIC_KEY = 'memaraTriggerSearchMatch';

type SearchStatic = {
	initialized?: boolean;
	lastIds?: string[];
};

function parseFiltersJson(raw: string): IDataObject | undefined {
	const s = raw.trim();
	if (!s) return undefined;
	try {
		const v = JSON.parse(s) as unknown;
		if (v && typeof v === 'object' && !Array.isArray(v)) {
			return v as IDataObject;
		}
	} catch {
		return undefined;
	}
	return undefined;
}

export class MemaraTriggerSearchMatch implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Memara Trigger: Search Match',
		name: 'memaraTriggerSearchMatch',
		icon: 'file:../shared/memara.svg',
		group: ['trigger'],
		version: 1,
		subtitle: 'Poll semantic search results',
		description:
			'Starts the workflow when new memories appear in the top N results of a semantic search (polling). Similarity scores are not exposed on this API path, so threshold-based filtering is not available. Each poll calls the search API and counts toward your Memara limits.',
		defaults: {
			name: 'Memara: Search match',
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
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				required: true,
				description: 'Natural-language search query passed to Memara semantic search',
				typeOptions: {
					rows: 3,
				},
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 10,
				description: 'Maximum results per poll (1–50)',
				typeOptions: {
					minValue: 1,
					maxValue: 50,
				},
			},
			{
				displayName: 'Workflow ID',
				name: 'workflowId',
				type: 'string',
				default: '',
				description: 'Optional n8n workflow ID metadata filter sent to the search API',
			},
			{
				displayName: 'Filters (JSON)',
				name: 'filtersJson',
				type: 'string',
				default: '',
				description:
					'Optional JSON object merged into the search request `filters` field. Invalid JSON is ignored.',
				typeOptions: {
					rows: 4,
				},
			},
		],
	};

	// eslint-disable-next-line no-unused-vars
	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const query = String(this.getNodeParameter('query', '') ?? '').trim();
		if (!query) {
			return null;
		}

		const limit = Math.min(
			Math.max(Number(this.getNodeParameter('limit', 10)) || 10, 1),
			50,
		);
		const workflowIdRaw = String(this.getNodeParameter('workflowId', '') ?? '').trim();
		const workflow_id = workflowIdRaw.length > 0 ? workflowIdRaw : undefined;
		const filters = parseFiltersJson(
			String(this.getNodeParameter('filtersJson', '') ?? ''),
		);

		const body: IDataObject = { query, limit };
		if (workflow_id) body.workflow_id = workflow_id;
		if (filters) body.filters = filters;

		const response = (await memaraRequest(this, {
			method: 'POST',
			url: '/api/v1/n8n/search',
			body,
			json: true,
		})) as { memories?: IDataObject[] };

		const raw = response.memories ?? [];

		const staticData = this.getWorkflowStaticData('node') as IDataObject;
		const state = (staticData[STATIC_KEY] as SearchStatic | undefined) ?? {};
		staticData[STATIC_KEY] = state as unknown as IDataObject;

		const currentIds = raw
			.map((m) => String(m.id ?? ''))
			.filter((id) => id.length > 0);

		if (currentIds.length === 0) {
			if (!state.initialized) {
				state.initialized = true;
				state.lastIds = [];
				staticData[STATIC_KEY] = state as unknown as IDataObject;
			}
			return null;
		}

		if (!state.initialized) {
			state.initialized = true;
			state.lastIds = currentIds;
			staticData[STATIC_KEY] = state as unknown as IDataObject;
			return null;
		}

		const prev = new Set(state.lastIds ?? []);
		const out: INodeExecutionData[] = [];
		for (const m of raw) {
			const id = String(m.id ?? '');
			if (id && !prev.has(id)) {
				out.push({ json: { ...m, _memaraTrigger: 'search_match' } });
			}
		}

		out.sort((a, b) =>
			String(a.json.id ?? '').localeCompare(String(b.json.id ?? '')),
		);

		state.lastIds = currentIds;
		staticData[STATIC_KEY] = state as unknown as IDataObject;

		if (out.length === 0) {
			return null;
		}
		return [out];
	}
}
