import type {
	IExecuteFunctions,
	IHttpRequestOptions,
	IPollFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

/** Context types that can call Memara HTTP APIs with `memaraApi` credentials. */
export type MemaraRequestContext = IExecuteFunctions | IPollFunctions;

export const MEMARA_USER_AGENT = 'n8n-memara-node/2.1.2';

function unknownToJsonObject(error: unknown): JsonObject {
	if (error instanceof Error) {
		const o: JsonObject = {
			message: error.message,
			name: error.name,
		};
		const extended = error as Error & {
			statusCode?: number;
			code?: string;
			response?: { status?: number; data?: unknown };
		};
		if (extended.statusCode !== undefined) {
			o.statusCode = extended.statusCode;
		}
		if (extended.code !== undefined) {
			o.code = extended.code;
		}
		if (extended.response && typeof extended.response === 'object') {
			o.response = extended.response as JsonObject;
		}
		return o;
	}
	if (error !== null && typeof error === 'object' && !Array.isArray(error)) {
		return error as JsonObject;
	}
	return { message: String(error) };
}

export function parseTagsCsv(tags: string): string[] {
	if (!tags || typeof tags !== 'string') {
		return [];
	}
	return tags
		.split(',')
		.map((t) => t.trim())
		.filter(Boolean);
}

export async function getMemaraBaseUrl(ctx: MemaraRequestContext): Promise<string> {
	const credentials = await ctx.getCredentials('memaraApi');
	const raw = credentials.baseUrl as string | undefined;
	const base =
		raw && typeof raw === 'string' && raw.trim().length > 0
			? raw.trim()
			: 'https://api.memara.io';
	return base.replace(/\/$/, '');
}

export async function memaraRequest(
	ctx: MemaraRequestContext,
	requestOptions: IHttpRequestOptions,
): Promise<unknown> {
	const baseURL = requestOptions.baseURL ?? (await getMemaraBaseUrl(ctx));
	const { headers: requestHeaders, json, ...rest } = requestOptions;
	try {
		return await ctx.helpers.httpRequestWithAuthentication.call(ctx, 'memaraApi', {
			...rest,
			baseURL,
			json: json !== undefined ? json : true,
			headers: {
				'User-Agent': MEMARA_USER_AGENT,
				...requestHeaders,
			},
		});
	} catch (error) {
		const payload =
			error instanceof NodeApiError || (error !== null && typeof error === 'object')
				? (error as JsonObject)
				: unknownToJsonObject(error);
		throw new NodeApiError(ctx.getNode(), payload);
	}
}
