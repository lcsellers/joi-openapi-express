import { OpenAPIV3 as v3 } from 'openapi-types'
import { RequestHandler } from 'express-serve-static-core'
import Joi from '@hapi/joi'
import HttpStatus from 'http-status-codes'

import {
	JoeSetup,
	JoeResponses,
	JoePathSpec,
	JoeOperationSpec,
	JoeValidators,
	JoeInputValidators,
	JoeOutputValidators,
	OptSingleSchema
} from '../../types'

import { createParametersSchema, createRequestBodySchema, createResponseSchema } from './joiToSchema'
import { JOE_OUTPUT_VALIDATORS } from './senders'

export const JOE_INSTANCE = Symbol('Joe Instance')

interface JoeDefaults {
	responses: JoeResponses
	accepts: string[]
	sends: string[]
	validators?: JoeValidators
}

type JoeOperationDefaults = JoeDefaults

export class Joe {

	doc: v3.Document

	private defaults: JoeDefaults
	private pathSpecs: Record<string, JoePathSpec>

	constructor(setup: JoeSetup = {}) {
		this.doc = {
			openapi: '3.0.0',
			info: setup.info,
			paths: {},
			components: setup.components,
			externalDocs: setup.externalDocs,
			security: setup.security,
			servers: setup.servers,
			tags: setup.tags
		}
		this.pathSpecs = {}
		this.defaults = {
			responses: setup.responses || [200],
			accepts: setup.accepts || ['application/json'],
			sends: setup.sends || ['application/json']
		}
	}

	mountJoe(mountpath: string, joe: Joe) {
		if(mountpath.endsWith('/')) {
			mountpath = mountpath.substr(0, mountpath.length - 1)
		}
		const paths = joe.doc.paths
		Object.keys(paths).forEach(path => {
			this.doc.paths[mountpath + path] = paths[path]
		})
	}

	// https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#pathItemObject
	setupPath(path: string, spec: JoePathSpec) {
		path = this.expressToOpenApiPath(path)
		this.pathSpecs[path] = spec
		
		// parameters can be manually defined, if so any validators will be ignored and not auto turned into parameters
		// if(!spec.parameters && spec.validators) {
		// 	spec.parameters = createParametersSchema(spec.validators)
		// }

		// if use() is called multiple times, we overwrite newly passed fields but keep old ones
		const pathItem = this.doc.paths[path] = this.doc.paths[path] ?? {}
		pathItem.summary		= spec.summary		?? pathItem.summary
		pathItem.description	= spec.description	?? pathItem.description
		pathItem.servers		= spec.servers		?? pathItem.servers
		pathItem.parameters		= spec.parameters	?? pathItem.parameters
	}

	// https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#operationObject
	setupOperation(path: string, method: string, spec: JoeOperationSpec | undefined, handlers: any[]): any[] {
		path = this.expressToOpenApiPath(path)

		if(!spec) {
			if(!this.pathSpecs[path]) return handlers
			spec = {}
		}

		const defaults = this.ensurePathPresent(path)
		if(!Array.isArray(defaults.accepts)) defaults.accepts = [defaults.accepts]
		if(!Array.isArray(defaults.sends)) defaults.sends = [defaults.sends]

		const validators = { ...defaults.validators, ...spec.validators }

		let hasInputValidators = false
		let outputValidators: JoeOutputValidators

		let parameters: v3.ParameterObject[]
		let requestBody: v3.RequestBodyObject

		if(validators) {
			// rename OpenAPI parameter 'types' to keys present on the express req
			const inputValidators: JoeInputValidators = {
				params: validators.path,
				headers: validators.header,
				cookies: validators.cookie,
				query: validators.query,
				// allow body validator to be a single Joi schema;
				// however we need the schemas ultimately keyed by mime type,
				// which is where the default 'accepts' array is used
				body: this.mapSingleSchema(validators.body, defaults.accepts)
			}
			hasInputValidators = Object.values(inputValidators).some(v => v !== undefined)

			// like body validator, response validator can be a single Joi schema,
			// but it needs to be keyed by HTTP status code, which we use defaults.responses for
			outputValidators = Joi.isSchema(validators.response)
				? Object.fromEntries(
					defaults.responses.map(
						res => [typeof res === 'number' ? res : res.code, validators.response as Joi.Schema]
					))
				: validators.response as Record<string, Joi.Schema>
			
			// insert pre- and post- validation middleware
			if(hasInputValidators || outputValidators) {
				handlers.unshift(this.createValidator(defaults.accepts, inputValidators, outputValidators))
			}

			// turn input validator Joi schema into openapi parameters and requestBody specifications
			if(hasInputValidators) {
				parameters = createParametersSchema(validators)
				requestBody = createRequestBodySchema(inputValidators.body)
			}
		}

		const op: v3.OperationObject = {
			tags: spec.tags,
			summary: spec.summary,
			description: spec.description,
			externalDocs: spec.externalDocs,
			operationId: spec.operationId,
			parameters: spec.parameters ?? parameters,
			requestBody: spec.requestBody ?? requestBody,
			responses: this.createResponsesObject(defaults.responses, defaults.sends, hasInputValidators, outputValidators),
			callbacks: spec.callbacks,
			deprecated: spec.deprecated,
			security: spec.security,
			servers: spec.servers
		}

		// clean up undefined
		for(const key of Object.keys(op)) {
			if(op[key] === undefined) {
				delete op[key]
			}
		}

		this.doc.paths[path][method] = op

		return handlers
	}

	private ensurePathPresent(path: string): JoeOperationDefaults {
		if(!this.doc.paths[path]) {
			this.doc.paths[path] = {}
		}
		const spec = this.pathSpecs[path] || {}
		return {
			responses: spec.responses || this.defaults.responses,
			accepts: spec.accepts || this.defaults.accepts,
			sends: spec.sends || this.defaults.sends,
			validators: spec.validators
		}
	}

	private expressToOpenApiPath(path: string) {
		return path.replace(/:(\w+)/g, '{$1}')
	}

	private mapSingleSchema(schema: OptSingleSchema, keys: string[]): Record<string, Joi.Schema> {
		return Joi.isSchema(schema)
			? Object.fromEntries(keys.map(k => [k, schema as Joi.Schema]))
			: schema as Record<string, Joi.Schema>
	}

	private createResponsesObject(responses: JoeResponses, sends: string[] | undefined, iV: boolean, oV?: JoeOutputValidators): v3.ResponsesObject {
		const finalResponses: v3.ResponsesObject = {}

		responses.forEach(res => {
			if(typeof res === 'number') {
				res = {
					code: res,
					description: HttpStatus.getStatusText(res)
				}
			}
			finalResponses[res.code] = {
				description: res.description
				// TODO: implement 'links'
			}
			if(res.headers) {
				(finalResponses[res.code] as v3.ResponseObject).headers = res.headers
			}
		})

		// ensure a success response is present. TODO: bad idea to force 200? spec says:
		// The Responses Object MUST contain at least one response code, and it SHOULD be the response for a successful operation call.
		// But that may not necessarily need to be 200.
		if(!finalResponses[200]) {
			finalResponses[200] = {
				description: HttpStatus.getStatusText(200)
			}
		}

		if(iV) {
			// input validation means potential 400
			if(!finalResponses[400]) {
				finalResponses[400] = {
					description: HttpStatus.getStatusText(400)
				}
			}
		}

		if(oV) {
			// output validation means potential 500
			if(!finalResponses[500]) {
				finalResponses[500] = {
					description: HttpStatus.getStatusText(500)
				}
			}
			
			Object.keys(oV).forEach(status => {
				if(!finalResponses[status]) {
					finalResponses[status] = {
						description: HttpStatus.getStatusText(parseInt(status))
					}
				}
				createResponseSchema(oV[status], finalResponses[status] as v3.ResponseObject, sends)
			})
		}

		return finalResponses
	}

	private createValidator(accepts: string[], iV?: JoeInputValidators, oV?: JoeOutputValidators): RequestHandler {
		return (req, res, next) => {
			if(iV) {
				for(const key of Object.keys(iV)) {
					let schema: Joi.Schema = iV[key]
					if(key === 'body' && schema) {
						// TODO: is there a better way to detect the incoming body mime type if 'Content-Type' not supplied?
						schema = schema[req.header('content-type') || accepts[0]]
					}
					if(schema) {
						const { error } = schema.validate(req[key])
						if(error) {
							return res.status(400).send({
								error: `${key} failed to validate: ${error.message}`
							})
						}
					}
				}
			}
			if(oV) {
				res[JOE_OUTPUT_VALIDATORS] = oV
			}
			next()
		}
	}

}
