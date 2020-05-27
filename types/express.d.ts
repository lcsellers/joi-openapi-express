import * as core from 'express-serve-static-core'

import { JoePathSpec } from './pathSpec'
import { JoeOperationSpec } from './opSpec'

export interface JoeResponse<ResBody = any> extends core.Response<ResBody> {
	/**
     * Send JSON response.
	 * Validates according to Joi schema defined for the response status code.
     */
    jsonValidated: core.Send<ResBody, this>;

    /**
     * Send JSON response with JSONP callback support.
	 * Validates according to Joi schema defined for the response status code.
     */
    jsonpValidated: core.Send<ResBody, this>;
}

export interface JoeRequestHandler<P extends core.Params = core.ParamsDictionary, ResBody = any, ReqBody = any> {
    // tslint:disable-next-line callable-types (This is extended from and can't extend from a type alias in ts<2.2
    (req: core.Request<P, ResBody, ReqBody>, res: JoeResponse<ResBody>, next: core.NextFunction): any;
}

export type JoeErrorRequestHandler<P extends core.Params = core.ParamsDictionary, ResBody = any, ReqBody = any> = (err: any, req: core.Request<P, ResBody, ReqBody>, res: JoeResponse<ResBody>, next: core.NextFunction) => any;

export type JoeRequestHandlerParams<P extends core.Params = core.ParamsDictionary, ResBody = any, ReqBody = any>
    = JoeRequestHandler<P, ResBody, ReqBody>
    | JoeErrorRequestHandler<P, ResBody, ReqBody>
    | Array<JoeRequestHandler<P>
    | JoeErrorRequestHandler<P>>;

export interface JoePathHandler<T> extends core.IRouterHandler<T> {
	(spec: JoePathSpec, ...handlers: JoeRequestHandler[]): T
    (spec: JoePathSpec, ...handlers: JoeRequestHandlerParams[]): T
}

export interface JoePathMatcher<T> extends core.IRouterMatcher<T> {
	// tslint:disable-next-line no-unnecessary-generics (This generic is meant to be passed explicitly.)
    <P extends core.Params = core.ParamsDictionary, ResBody = any, ReqBody = any>(path: core.PathParams, spec: JoePathSpec, ...handlers: Array<JoeRequestHandler<P, ResBody, ReqBody>>): T;
    // tslint:disable-next-line no-unnecessary-generics (This generic is meant to be passed explicitly.)
    <P extends core.Params = core.ParamsDictionary, ResBody = any, ReqBody = any>(path: core.PathParams, spec: JoePathSpec, ...handlers: Array<JoeRequestHandlerParams<P, ResBody, ReqBody>>): T;
    (path: core.PathParams, spec: JoePathSpec, subApplication: core.Application): T;
}

export interface JoeRouterMatcher<T> extends core.IRouterMatcher<T> {
    // tslint:disable-next-line no-unnecessary-generics (This generic is meant to be passed explicitly.)
    <P extends core.Params = core.ParamsDictionary, ResBody = any, ReqBody = any>(path: core.PathParams, spec: JoeOperationSpec, ...handlers: Array<JoeRequestHandler<P, ResBody, ReqBody>>): T;
    // tslint:disable-next-line no-unnecessary-generics (This generic is meant to be passed explicitly.)
    <P extends core.Params = core.ParamsDictionary, ResBody = any, ReqBody = any>(path: core.PathParams, spec: JoeOperationSpec, ...handlers: Array<JoeRequestHandlerParams<P, ResBody, ReqBody>>): T;
    (path: core.PathParams, spec: JoeOperationSpec, subApplication: core.Application): T;
}

export interface JoeExpress extends core.Express {
	get: JoeRouterMatcher<this>
	post: JoeRouterMatcher<this>
	put: JoeRouterMatcher<this>
	delete: JoeRouterMatcher<this>
	patch: JoeRouterMatcher<this>
	options: JoeRouterMatcher<this>
	head: JoeRouterMatcher<this>
	trace: JoeRouterMatcher<this>

	use: JoePathMatcher<this> & JoePathHandler<this>
		& ((...handlers: Array<Function | JoeRequestHandlerParams>) => this)
		& ((spec: JoePathSpec, ...handlers: JoeRequestHandlerParams[]) => this)
}

export interface JoeRouter extends core.Router {
	get: JoeRouterMatcher<this>
	post: JoeRouterMatcher<this>
	put: JoeRouterMatcher<this>
	delete: JoeRouterMatcher<this>
	patch: JoeRouterMatcher<this>
	options: JoeRouterMatcher<this>
	head: JoeRouterMatcher<this>
	trace: JoeRouterMatcher<this>

	use: JoePathMatcher<this> & JoePathHandler<this>
}