import type { Icon } from 'n8n-workflow';
import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MemaraApi implements ICredentialType {
	name = 'memaraApi';
	displayName = 'Memara API';
	icon: Icon = 'file:memara.svg';
	documentationUrl = 'https://memara.io/integrations/n8n';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Your Memara API key. Get it from Settings > API Keys in your Memara dashboard.',
			placeholder: 'mk_live_...',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.memara.io',
			required: false,
			description: 'Base URL for Memara API. Use default unless you have a custom deployment.',
			placeholder: 'https://api.memara.io',
		},
	];

	// Authentication configuration for HTTP requests
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'Authorization': '=Bearer {{$credentials.apiKey}}',
				'Content-Type': 'application/json',
				'User-Agent': 'n8n-memara-node/2.1.2',
			},
		},
	};

	// Test the credential by making a simple API call
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/v1/n8n/integration/info',
			method: 'GET',
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'integration_name',
					value: '',
					message: 'API key is valid and can access Memara n8n integration',
				},
			},
		],
	};
}
