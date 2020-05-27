const { expect } = require('chai')
const joe = require('../dist')
const { JOE_INSTANCE } = require('../dist/joe')

describe('Express API', () => {

	it('should detect path specs properly', () => {

		const app = joe.express()

		app.use('/', [() => {}], () => {})
		app.get('/', () => {})

		expect(app[JOE_INSTANCE].doc.paths['/']).not.to.exist

	})

})