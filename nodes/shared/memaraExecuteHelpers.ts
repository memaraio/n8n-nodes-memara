import type { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

/**
 * Output item shape when Continue On Fail is enabled (plain-object json).
 */
export function continueOnFailItem(itemIndex: number, error: unknown): INodeExecutionData {
	const message = error instanceof Error ? error.message : String(error);
	const err: IDataObject = {
		message,
		name: error instanceof Error ? error.name : 'Error',
	};
	if (error instanceof NodeApiError && error.httpCode) {
		err.httpCode = error.httpCode;
	}
	if (error instanceof NodeApiError && error.description) {
		err.description = error.description;
	}
	return {
		json: { error: err },
		pairedItem: { item: itemIndex },
	};
}
