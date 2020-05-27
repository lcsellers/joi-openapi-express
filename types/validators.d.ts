import Joi from '@hapi/joi'

export type OptSingleSchema = Joi.Schema | Record<string, Joi.Schema>

export interface JoeValidators {
	path?: Joi.Schema
	header?: Joi.Schema
	cookie?: Joi.Schema
	query?: Joi.Schema
	body?: OptSingleSchema
	response?: OptSingleSchema
}

export interface JoeInputValidators {
	params?: Joi.Schema
	headers?: Joi.Schema
	cookies?: Joi.Schema
	query?: Joi.Schema
	body?: Record<string, Joi.Schema>
}

export type JoeOutputValidators = Record<string, Joi.Schema>