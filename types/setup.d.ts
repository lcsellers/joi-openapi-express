import { OpenAPIV3 as v3 } from 'openapi-types'

import { JoeResponses } from './responses'

export interface JoeSetup {
	info?: v3.InfoObject
	servers?: v3.ServerObject[]
	components?: v3.ComponentsObject
	security?: v3.SecurityRequirementObject[]
	tags?: v3.TagObject[]
	externalDocs?: v3.ExternalDocumentationObject
	responses?: JoeResponses
	accepts?: string[]
	sends?: string[]
	docRoute?: string | false
	writePath?: string | false
}