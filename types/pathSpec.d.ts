import { OpenAPIV3 as v3 } from 'openapi-types'

import { JoeResponses } from './responses'
import { JoeValidators } from './validators'

export interface JoePathSpec {
	summary?: string
	description?: string
	servers?: v3.ServerObject[]
	parameters?: v3.ParameterObject[]
	responses?: JoeResponses
	accepts?: string[]
	sends?: string[]
	validators?: JoeValidators
}