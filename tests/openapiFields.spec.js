const { expect } = require('chai')
const joe = require('../dist')
const { JOE_INSTANCE } = require('../dist/joe')

describe('OpenAPI Fields', () => {

	it('adds the given openapi fields to the root doc', () => {
		const config = {
			components: {
				callbacks: { foo: { $ref: 'foo' } }
			},
			externalDocs: {
				url: 'http://example.com'
			},
			info: {
				title: 'A Test',
				version: '3.0.0'
			},
			security: [{
				api_key: []
			}],
			servers: [{
				url: 'http://example.com'
			}],
			tags: ['foo', 'bar']
		}

		const app = joe.express(config)

		for(const key in config) {
			expect(app[JOE_INSTANCE].doc[key]).to.deep.eq(config[key])
		}
	})

	it('adds the given openapi fields to the path', () => {
		const config = {
			description: 'A Test',
			parameters: [{
				in: 'query',
				name: 'foo'
			}],
			servers: [{
				url: 'http://example.com'
			}],
			summary: 'A Test'
		}

		const app = joe.express()
		app.use('/', config)

		for(const key in config) {
			expect(app[JOE_INSTANCE].doc.paths['/'][key]).to.deep.eq(config[key])
		}
	})

	it('adds the given openapi fields to the operation', () => {
		const config = {
			callbacks: {
				foo: { $ref: 'foo' }
			},
			deprecated: false,
			description: 'A Test',
			externalDocs: {
				url: 'http://example.com',
				description: 'External Docs'
			},
			operationId: 'foo',
			parameters: [{
				in: 'query',
				name: 'foo'
			}],
			requestBody: {
				content: {
					'text/html': {
						example: 'Foo Bar'
					}
				}
			},
			security: [{
				api_key: []
			}],
			servers: [{
				url: 'http://example.com'
			}],
			summary: 'A Test',
			tags: ['foo', 'bar']
		}

		const app = joe.express()
		app.get('/', config, (req, res, next) => next())

		for(const key in config) {
			expect(app[JOE_INSTANCE].doc.paths['/'].get[key]).to.deep.eq(config[key])
		}
	})

})