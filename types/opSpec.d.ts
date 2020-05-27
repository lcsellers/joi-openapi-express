import { OpenAPIV3 as v3 } from 'openapi-types'

import { JoeResponses } from './responses'
import { JoeValidators } from './validators'

export interface JoeOperationSpec {
	responses?: JoeResponses,
	parameters?: v3.ParameterObject[],
	requestBody?: v3.RequestBodyObject,
	tags?: string[]
	summary?: string
	description?: string
	externalDocs?: v3.ExternalDocumentationObject
	operationId?: string
	deprecated?: boolean
	security?: v3.SecurityRequirementObject[]
	callbacks?: { [callback: string]: v3.CallbackObject | v3.ReferenceObject }
	servers?: v3.ServerObject[]
	validators?: JoeValidators
}