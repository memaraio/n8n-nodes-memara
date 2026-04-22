import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { memaraRequest, parseTagsCsv } from '../shared/memaraBase';
import { continueOnFailItem } from '../shared/memaraExecuteHelpers';

export class MemaraCreateMemory implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Memara Create Memory',
		name: 'memaraCreateMemory',
		icon: 'file:../shared/memara.svg',
		group: ['transform'],
		version: 1,
		subtitle: 'Create memory',
		description: 'Store a new memory in your Memara space for semantic search later',
		defaults: {
			name: 'Memara: Create',
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
				displayName: 'Content',
				name: 'content',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				description: 'The content of the memory to store',
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
				const content = this.getNodeParameter('content', i) as string;
				const title = this.getNodeParameter('title', i) as string;
				const tagsRaw = this.getNodeParameter('tags', i) as string;
				const body = {
					content,
					title,
					tags: parseTagsCsv(tagsRaw),
				};

				const response = (await memaraRequest(this, {
					method: 'POST',
					url: '/api/v1/n8n/memories',
					body,
				})) as IDataObject;

				returnData.push({
					json: {
						success: true,
						id: response.id,
						memory: response,
					},
					pairedItem: { item: i },
				});
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
