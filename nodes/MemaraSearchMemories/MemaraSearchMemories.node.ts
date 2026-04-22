import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { memaraRequest } from '../shared/memaraBase';
import { continueOnFailItem } from '../shared/memaraExecuteHelpers';

export class MemaraSearchMemories implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Memara Search Memories',
		name: 'memaraSearchMemories',
		icon: 'file:../shared/memara.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["query"]}}',
		description: 'Find relevant memories in Memara using semantic search',
		defaults: {
			name: 'Memara: Search',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'memaraApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Search Query',
				name: 'query',
				type: 'string',
				default: '',
				required: true,
				description: 'Search query to find relevant memories',
				placeholder: 'e.g. automation',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 10,
				description: 'Maximum number of memories to return',
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
			},
		],
	};

	// eslint-disable-next-line no-unused-vars
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const query = this.getNodeParameter('query', i) as string;
				const limit = (this.getNodeParameter('limit', i) as number) || 10;

				const response = (await memaraRequest(this, {
					method: 'POST',
					url: '/api/v1/n8n/search',
					body: { query, limit },
				})) as { memories?: IDataObject[] };

				const memories = response.memories ?? [];
				for (const memory of memories) {
					returnData.push({
						json: memory,
						pairedItem: { item: i },
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push(continueOnFailItem(i, error));
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
