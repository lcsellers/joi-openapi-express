const cookieParser = require('cookie-parser')
const { json } = require('express')
const joe = require('../dist')
const Joi = require('@hapi/joi')
const supertest = require('supertest')

function testApp() {
	const app = joe.express()
	app.use(cookieParser())
	app.use(json())
	
	const dummySchema = Joi.object({ test: Joi.string().valid('valid') }).unknown()
	const dummyResponse = (req, res) => res.sendStatus(200)
	
	app.get('/cookies', {
		validators: { cookie: dummySchema }
	}, dummyResponse)
	
	app.get('/header', {
		validators: { header: dummySchema }
	}, dummyResponse)
	
	app.get('/path/:test', {
		validators: { path: dummySchema }
	}, dummyResponse)
	
	app.get('/query', {
		validators: { query: dummySchema }
	}, dummyResponse)
	
	app.post('/body', {
		validators: { body: dummySchema }
	}, dummyResponse)

	app.get('/response/:validity', {
		validators: { response: dummySchema }
	}, (req, res) => res.jsonValidated({ test: req.params.validity }))

	return app
}

describe('Input/Output Validation', () => {

	let request

	before(() => request = supertest(testApp()))

	it('validates cookies', async () => {

		await request
			.get('/cookies')
			.set('Cookie', ['test=valid'])
			.expect(200)
		
		await request
			.get('/cookies')
			.set('Cookie', ['test=invalid'])
			.expect(400)

	})

	it('validates header', async () => {

		await request
			.get('/header')
			.set('test', ['valid'])
			.expect(200)
		
		await request
			.get('/header')
			.set('test', ['invalid'])
			.expect(400)

	})

	it('validates path', async () => {

		await request
			.get('/path/valid')
			.expect(200)

		await request
			.get('/path/invalid')
			.expect(400)

	})

	it('validates query', async () => {

		await request
			.get('/query?test=valid')
			.expect(200)
		
		await request
			.get('/query?test=invalid')
			.expect(400)

	})

	it('validates body', async () => {

		await request
			.post('/body')
			.send({ test: 'valid' })
			.expect(200)
		
		await request
			.post('/body')
			.send({ test: 'invalid' })
			.expect(400)

	})

	it('validates response', async () => {

		const oldError = console.error
		console.error = () => {}

		await request
			.get('/response/valid')
			.expect(200)
		
		await request
			.get('/response/invalid')
			.expect(500)

		console.error = oldError

	})

})