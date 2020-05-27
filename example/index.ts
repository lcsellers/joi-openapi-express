import express from 'express'
import * as joe from '../dist'
import Joi from '@hapi/joi'

const app = joe.express({
	info: {
		title: 'Joi Openapi Express Example',
		version: '3.0.0'
	}
})

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.get('/', (req, res) => {
	res.send('Hello World')
})

app.get('/hello', {
	validators: {
		query: Joi.object({ name: Joi.string().required().example('John Doe') }),
		response: {
			200: Joi.object({ message: Joi.string().required().example('Hello John Doe') })
		}
	}
}, (req, res) => {
	res.jsonValidated({
		message: `Hello, ${req.query.name}`
	})
})

app.get('/foo', { description: 'Foo Bar' }, (req, res) => res.send('hello'))

const PORT = 3000
app.listen(PORT, () => console.log(`listening on ${PORT}`))