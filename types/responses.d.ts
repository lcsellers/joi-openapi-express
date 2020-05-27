import { OpenAPIV3 as v3 } from 'openapi-types'

export type JoeResponses = Array<number | {
	code: number
	description: string
	// TODO: include response headers as a validation type which will automatically generate these
	headers?: Record<string, v3.HeaderObject>
}>