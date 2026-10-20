import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';

import { memaraRequest, parseTagsCsv } from '../shared/memaraBase';
import { continueOnFailItem } from '../shared/memaraExecuteHelpers';

export class MemaraUpdateMemory implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Memara Update Memory',
		name: 'memaraUpdateMemory',
		icon: 'file:../shared/memara.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["memoryId"]}}',
		description: 'Update an existing memory in Memara',
		defaults: {
			name: 'Memara: Update',
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
				description: 'The ID of the memory to update',
				placeholder: 'e.g. mem_abc123',
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				description: 'The new content for the memory',
				placeholder: 'Enter the information you want to remember...',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Optional title for the memory',
				placeholder: 'e.g. Customer follow-up notes',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: 'Comma-separated tags for organizing memories',
				placeholder: 'e.g. customer-support, billing',
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
				const content = this.getNodeParameter('content', i) as string;
				const title = this.getNodeParameter('title', i) as string;
				const tagsRaw = this.getNodeParameter('tags', i) as string;
				const tags = parseTagsCsv(tagsRaw);

				const body: IDataObject = {
					content,
					title,
				};
				if (tags.length > 0) {
					body.tags = tags;
				}

				const response = (await memaraRequest(this, {
					method: 'PUT',
					url: `/api/v1/n8n/memories/${memoryId}`,
					body,
				})) as IDataObject;

				returnData.push({
					json: {
						success: true,
						id: memoryId,
						memory: response,
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
