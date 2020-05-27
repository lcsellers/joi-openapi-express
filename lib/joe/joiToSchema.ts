import { OpenAPIV3 as v3 } from 'openapi-types'
import Joi from '@hapi/joi'
import j2s from 'joi-to-swagger'
import { JoeValidators } from '../../types'

export function createParametersSchema(validators: JoeValidators): v3.ParameterObject[] | undefined {
	let parameters: v3.ParameterObject[]
	const { response, body, ...paramValidators } = validators

	if(paramValidators) {
		parameters = []

		for(const parameterType in paramValidators) {
			const schema = paramValidators[parameterType]

			const deprecated = {}
			const children = Joi.isSchema(schema)
				? schema.$_terms.keys
				: Object.keys(schema).map(key => ({ key, schema: schema[key] }))
			if(Array.isArray(children)) {
				for(const child of children) {
					for(const meta of child.schema.$_terms.metas) {
						if(meta.deprecated) {
							deprecated[child.key] = true
							break
						}
					}
				}
			}

			const { swagger } = j2s(schema)
			const { properties } = swagger
			for(const parameterName in properties) {
				const prop = properties[parameterName]
				const parameter: v3.ParameterObject = {
					name: parameterName,
					in: parameterType,
				}
				if(deprecated[parameterName]) {
					parameter.deprecated = true
				}
				for(const key of ['description', 'example', 'examples']) {
					if(prop[key]) {
						parameter[key] = prop[key]
						delete prop[key]
					}
				}
				if(parameterType === 'path' || (swagger.required && swagger.required.includes(parameterName))) {
					parameter.required = true
				}
				parameter.schema = prop
				parameters.push(parameter)
			}
		}

		if(!parameters.length) return undefined
	}

	return parameters
}

export function createRequestBodySchema(validators?: Record<string, Joi.Schema>): v3.RequestBodyObject | undefined {
	if(!validators) return undefined

	let description = ''
	let required = false

	const content = {}

	for(const mime of Object.keys(validators)) {
		const schema = validators[mime]
		const mediaType: v3.MediaTypeObject = {}

		if(schema._flags.presence === 'required') {
			required = true
		}

		const { swagger } = j2s(schema) as any

		if(swagger.description) {
			description = swagger.description
			delete swagger.description
		}

		for(const key of ['example', 'examples']) {
			if(swagger[key]) {
				mediaType[key] = swagger[key]
				delete swagger[key]
			}
		}

		mediaType.schema = swagger
		content[mime] = mediaType
	}

	const requestBody: v3.RequestBodyObject = { content }
	if(description) requestBody.description = description
	if(required) requestBody.required = required

	return requestBody
}

export function createResponseSchema(validator: Joi.Schema, res: v3.ResponseObject, sends: string[]): v3.ResponseObject {

	const mediaType: v3.MediaTypeObject = {}
	const { swagger } = j2s(validator)

	for(const key of ['example', 'examples']) {
		if(swagger[key]) {
			mediaType[key] = swagger[key]
			delete swagger[key]
		}
	}
	mediaType.schema = swagger as v3.SchemaObject

	res.content = Object.fromEntries(sends.map(mime => [mime, mediaType]))
	return res
}