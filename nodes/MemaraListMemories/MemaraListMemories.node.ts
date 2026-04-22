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

export class MemaraListMemories implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Memara List Memories',
		name: 'memaraListMemories',
		icon: 'file:../shared/memara.svg',
		group: ['transform'],
		version: 1,
		subtitle: 'List memories',
		description: 'Retrieve memories from your Memara space with pagination',
		defaults: {
			name: 'Memara: List',
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
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				description: 'Maximum number of memories to return',
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
			},
			{
				displayName: 'Offset',
				name: 'offset',
				type: 'number',
				default: 0,
				description: 'Number of memories to skip (for pagination)',
				typeOptions: {
					minValue: 0,
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
				const limit = (this.getNodeParameter('limit', i) as number) || 50;
				const offset = (this.getNodeParameter('offset', i) as number) || 0;

				const response = (await memaraRequest(this, {
					method: 'GET',
					url: '/api/v1/n8n/memories',
					qs: { limit, offset },
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
