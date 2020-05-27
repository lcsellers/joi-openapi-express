import express, { RouterOptions } from 'express'
import { promises } from 'fs'

import { wrap } from './wrap'
import { Joe, JOE_INSTANCE } from './joe'
import { createValidatedSender } from './joe/senders'
import { JoeSetup, JoeExpress, JoeRouter, JoePathSpec } from '../types'

const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace']

function joeExpress(setup?: JoeSetup) {

	if(!setup) setup = {}

	let { docRoute, writePath } = setup
	if(docRoute === undefined) docRoute = '/openapi.json'

	const app = express()
	const instance = new Joe(setup)

	app.response['jsonValidated'] = createValidatedSender('json')
	app.response['jsonpValidated'] = createValidatedSender('jsonp')

	return wrapRouter(app, instance, {
		listen: (...args: any[]) => {
			delete instance.doc.paths.env
			if((docRoute || writePath) && !instance.doc.info) {
				throw new Error('OpenAPI requires an "info" object in the root of the document. Please pass "info" with the Joe Setup and do not call listen() on any but the root express instance.')
			}
			if(docRoute && typeof docRoute === 'string') {
				app.get(docRoute, (req, res) => {
					res.json(instance.doc)
				})
			}
			if(writePath && typeof writePath === 'string') {
				promises.writeFile(writePath, JSON.stringify(instance.doc, null, 4))
			}
			return app.listen(...args)
		}
	}) as JoeExpress

}

function joeRouter(spec?: JoePathSpec): JoeRouter
function joeRouter(opts?: RouterOptions, spec?: JoePathSpec): JoeRouter
function joeRouter(a?: RouterOptions | JoePathSpec, spec?: JoePathSpec) {
	
	let opts: RouterOptions | undefined

	if(a !== undefined) {
		if(['caseSensitive', 'mergeParams', 'strict'].some(key => a[key] !== undefined)) {
			opts = a as RouterOptions
		} else {
			spec = a as JoePathSpec
		}
	}

	const router = express.Router(opts)
	const instance = new Joe()
	if(spec) {
		instance.setupPath('/', spec)
	}

	return wrapRouter(router, instance) as JoeRouter

}

function wrapRouter<T extends Function>(router: T, instance: Joe, extra?: any): T {

	router[JOE_INSTANCE] = instance

	function proxy(...args: any[]) {
		return router(...args)
	}

	if(extra) {
		for(const key in extra) {
			proxy[key] = extra[key]
		}
	}

	proxy.use = (...args: any[]) => {
		let path = '/'
		if(typeof args[0] === 'string') {
			path = args.shift()
		}
		// disambiguate path spec from middleware functions, Applications, and Routers
		if(args[0] && !Array.isArray(args[0]) && typeof args[0] !== 'function' && !args[0].get) {
			instance.setupPath(path, args.shift())
		}
		if(args.length) {
			// look for child joe instances which need to be mounted
			args.forEach(arg => {
				const childJoe: Joe = arg[JOE_INSTANCE]
				if(childJoe) {
					instance.mountJoe(path, childJoe)
				}
			})
			return router['use'](path, ...args)
		} else {
			return router
		}
	}

	proxy.route = (path: string) => {
		const route = router['route'](path)
		const routeProxy: any = {}

		methods.forEach(method => {
			routeProxy[method] = (...args: any[]) => {
				if(typeof args[0] !== 'function') {
					const spec = args.shift()
					args = instance.setupOperation(path, method, spec, args)
				}
				return route[method](...args)
			}
		})

		Object.setPrototypeOf(routeProxy, route)
		return routeProxy
	}

	methods.forEach(method => {
		proxy[method] = (path: string, ...args: any[]) => {
			// detect presence of a spec object by it not being a function
			// RouterMatcher functions can also take an Application as the second arg, in which case
			// it will be the last arg
			const spec = args[0] !== 'function' && args.length > 1 ? args.shift() : undefined
			args = instance.setupOperation(path, method, spec, args)
			return router[method](path, ...args)
		}
	})

	Object.setPrototypeOf(proxy, router)

	return proxy as unknown as T
}

export {
	joeExpress as express,
	joeRouter as router,
	wrap
}