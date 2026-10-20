import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';

import { memaraRequest } from '../shared/memaraBase';
import { continueOnFailItem } from '../shared/memaraExecuteHelpers';

export class MemaraDeleteMemory implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Memara Delete Memory',
		name: 'memaraDeleteMemory',
		icon: 'file:../shared/memara.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["memoryId"]}}',
		description: 'Permanently delete a memory from Memara',
		defaults: {
			name: 'Memara: Delete',
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
				displayName: 'Memory ID',
				name: 'memoryId',
				type: 'string',
				default: '',
				required: true,
				description: 'The ID of the memory to delete',
				placeholder: 'e.g. mem_abc123',
			},
		],
	};

	// eslint-disable-next-line no-unused-vars
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const memoryId = this.getNodeParameter('memoryId', i) as string;

				await memaraRequest(this, {
					method: 'DELETE',
					url: `/api/v1/n8n/memories/${memoryId}`,
					json: false,
				});

				returnData.push({
					json: {
						success: true,
						id: memoryId,
						deleted: true,
					},
					pairedItem: { item: i },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push(continueOnFailItem(i, error));
					continue;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject);
			}
		}

		return [returnData];
	}
}
