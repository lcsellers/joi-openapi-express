const { expect } = require('chai')
const joe = require('../dist')
const { JOE_INSTANCE } = require('../dist/joe')
const Joi = require('@hapi/joi')

describe('Transform JOI Schema into Openapi fields', () => {

	it('includes cookie validators in parameters', () => {

		const app = joe.express()
		app.get('/', {
			validators: {
				cookie: Joi.object({
					_ga: Joi.string()
						.example('GAxxxxxxxx')
						.description('Google Analytics'),
					user_session: Joi.string().required().description('User Session ID (base64)')
				})
			}
		}, () => {})

		expect(app[JOE_INSTANCE].doc.paths['/'].get.parameters).to.deep.eq([
			{
				name: '_ga',
				in: 'cookie',
				description: 'Google Analytics',
				example: 'GAxxxxxxxx',
				schema: { type: 'string' }
			},
			{
				name: 'user_session',
				in: 'cookie',
				description: 'User Session ID (base64)',
				required: true,
				schema: { type: 'string' }
			}
		])

	})

	it('includes header validators in parameters', () => {

		const app = joe.express()
		app.get('/', {
			validators: {
				header: Joi.object({
					From: Joi.string().email().required().example('user@test.com')
				})
			}
		}, () => {})

		expect(app[JOE_INSTANCE].doc.paths['/'].get.parameters).to.deep.eq([
			{
				name: 'From',
				in: 'header',
				example: 'user@test.com',
				required: true,
				schema: {
					type: 'string',
					format: 'email'
				}
			}
		])

	})

	it('includes path param validators in parameters', () => {

		const app = joe.express()
		app.get('/:id', {
			validators: {
				path: Joi.object({
					id: Joi.number().integer().min(0).max(100).description('ID of the resource to retrieve')
				})
			}
		}, () => {})

		expect(app[JOE_INSTANCE].doc.paths['/{id}'].get.parameters).to.deep.eq([
			{
				name: 'id',
				in: 'path',
				description: 'ID of the resource to retrieve',
				required: true,
				schema: {
					type: 'integer',
					minimum: 0,
					maximum: 100
				}
			}
		])

	})

	it('includes query validators in parameters', () => {

		const app = joe.express()
		app.get('/', {
			validators: {
				query: Joi.object({
					q: Joi.string().description('The query').example('Foo Bar').example('Baz Bing'),
					n: Joi.string().description('The old name').meta({ deprecated: true })
				})
			}
		}, () => {})

		expect(app[JOE_INSTANCE].doc.paths['/'].get.parameters).to.deep.eq([
			{
				name: 'q',
				in: 'query',
				description: 'The query',
				examples: ['Foo Bar', 'Baz Bing'],
				schema: { type: 'string' }
			},
			{
				name: 'n',
				in: 'query',
				description: 'The old name',
				deprecated: true,
				schema: { type: 'string' }
			}
		])

	})

	it('includes request body validators in requestBody', () => {

		const app = joe.express()
		app.get('/', {
			validators: {
				body: Joi.object({
					name: Joi.string().alphanum().required(),
					email: Joi.string().email().required(),
					password: Joi.string().alphanum().min(8).required()
				}).required().description('New user data').example({
					name: 'John Doe',
					email: 'john@doe.com',
					password: 'password123'
				})
			}
		}, () => {})

		expect(app[JOE_INSTANCE].doc.paths['/'].get.requestBody).to.deep.eq({
			description: 'New user data',
			required: true,
			content: {
				'application/json': {
					schema: {
						type: 'object',
						required: ['name', 'email', 'password'],
						additionalProperties: false,
      			        properties: {
							name: {
								type: "string",
								pattern: "^[a-zA-Z0-9]*$"
							},
							email: {
								type: "string",
								format: "email"
							},
							password: {
								type: "string",
								minLength: 8,
								pattern: "^[a-zA-Z0-9]*$"
							}
						}
					},
					example: {
						name: 'John Doe',
						email: 'john@doe.com',
						password: 'password123'
					}
				}
			}
		})

	})

	it('includes response validators in responses', () => {

		const app = joe.express()
		app.get('/', {
			validators: {
				response: Joi.object({
					command: Joi.string().valid('cut', 'copy', 'paste'),
					status: Joi.string().valid('in progress', 'complete')
				}).example({
					command: 'copy',
					status: 'in progress'
				})
			}
		}, () => {})

		expect(app[JOE_INSTANCE].doc.paths['/'].get.responses).to.deep.eq({
			200: {
				description: 'OK',
				content: {
					'application/json': {
						schema: {
							type: 'object',
							additionalProperties: false,
							properties: {
								command: {
									type: 'string',
									enum: ['cut', 'copy', 'paste']
								},
								status: {
									type: 'string',
									enum: ['in progress', 'complete']
								}
							}
						},
						example: {
							command: 'copy',
							status: 'in progress'
						}
					}
				}
			},
			500: {
				description: 'Server Error'
			}
		})

	})

})