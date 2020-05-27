const { expect } = require('chai')
const joe = require('../dist')
const { JOE_INSTANCE } = require('../dist/joe')
const Joi = require('@hapi/joi')

describe('Add Operation Objects', () => {

	const genericMiddleware = (req, res, next) => next()

	it('supports all openapi supported methods', () => {

		const methodDescriptions = {
			get: 'Get a resource',
			post: 'Post to a resource',
			put: 'Put data in a resource',
			delete: 'Delete a resource',
			patch: 'Patch a resource',
			options: 'Get resource options',
			head: 'Get resource headers',
			trace: 'Perform loopback test to the resource'
		}

		const paths = ['/resource1', '/resource2']
		const app = joe.express()
		const router = joe.router()

		for(const path of paths) {
			for(const method in methodDescriptions) {
				app[method](path, { description: methodDescriptions[method] }, genericMiddleware)
				router[method](path, { description: methodDescriptions[method] }, genericMiddleware)
			}
		}

		for(const path of paths) {
			for(const method in methodDescriptions) {
				expect(app[JOE_INSTANCE].doc.paths[path][method].description).to.eq(methodDescriptions[method],
					`description for ${method} request to ${path} failed test on application`)
				expect(router[JOE_INSTANCE].doc.paths[path][method].description).to.eq(methodDescriptions[method],
					`description for ${method} request to ${path} failed test on router`)
			}
		}
	})

	it('allows adding operations by retrieving a Route object', () => {

		const app = joe.express()
		app.route('/a').get({ description: 'Get A' }, genericMiddleware)

		const router = joe.router()
		router.route('/a').get({ description: 'Get A' }, genericMiddleware)

		expect(app[JOE_INSTANCE].doc.paths['/a'].get).to.exist
		expect(router[JOE_INSTANCE].doc.paths['/a'].get).to.exist

	})

	it('merges operations from nested express applications and routers correctly', () => {

		const tertiaryRouter = joe.router()
		tertiaryRouter.get('/foo', { description: 'Tertiary Foo' }, genericMiddleware)
		tertiaryRouter.get('/bar', { description: 'Tertiary Bar' }, genericMiddleware)
		const tertiaryApp = joe.express()
		tertiaryApp.get('/baz', { description: 'Tertiary Baz' }, genericMiddleware)

		const secondaryRouter = joe.router()
		secondaryRouter.get('/1', { description: 'Secondary One' }, genericMiddleware)
		secondaryRouter.use('/2', tertiaryRouter)
		secondaryRouter.use('/3', tertiaryApp)
		const secondaryApp = joe.express()
		secondaryApp.get('/4', { description: 'Secondary Four' }, genericMiddleware)

		const mainApp = joe.express()
		mainApp.get('/a', { description: 'Main A' }, genericMiddleware)
		mainApp.use('/b', secondaryRouter)
		mainApp.use('/c', secondaryApp)

		expect(mainApp[JOE_INSTANCE].doc.paths).to.have.keys(
			'/a',
			'/b/1',
			'/b/2/foo',
			'/b/2/bar',
			'/b/3/baz',
			'/c/4'
		)
	})

	it('inherits properties from use()', () => {

		const app = joe.express()
		app.use('/', {
			accepts: ['text/plain'],
			sends: ['text/html'],
			responses: [200, 203, 204],
			validators: {
				body: Joi.string().valid('one', 'two'),
				response: Joi.string()
			}
		})

		const bodySchema = {
			type: 'string',
			enum: ['one', 'two']
		}
		const responseSchema = {
			'text/html': {
				schema: {
					type: 'string'
				}
			}
		}

		const commonOp = {
			requestBody: { content: { 'text/plain': { schema: bodySchema } } },
			responses: {
				200: { description: 'OK', content: responseSchema },
				203: { description: 'Non Authoritative Information', content: responseSchema },
				204: { description: 'No Content', content: responseSchema },
				400: { description: 'Bad Request' },
				500: { description: 'Server Error' }
			}
		}

		app.post('/', () => {})
		app.patch('/', () => {})

		expect(app[JOE_INSTANCE].doc.paths['/'].post).to.deep.eq(commonOp)
		expect(app[JOE_INSTANCE].doc.paths['/'].patch).to.deep.eq(commonOp)

	})

})